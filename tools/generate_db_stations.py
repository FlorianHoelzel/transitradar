"""Build the DB map data from the GTFS.de rail feeds and Natural Earth."""

import argparse
import csv
import io
import json
import re
import zipfile
from collections import defaultdict
from pathlib import Path


OUTPUT = Path(__file__).resolve().parents[1] / "web/data/db-stations.json"
NON_REGIONAL = re.compile(r"(?:S|(?:S|RS)\s*\d+\w*|S-BAHN.*|SEV.*)")
ICE = re.compile(r"ICE(?:\s*\d+\w*)?")
STATION_MODE_PREFIX = re.compile(r"^(?:S\+U|S|U)\s+")


def read_rows(feed, table):
    with feed.open(f"{table}.txt") as raw_file:
        yield from csv.DictReader(io.TextIOWrapper(raw_file, encoding="utf-8-sig"))


def inside_ring(lon, lat, ring):
    inside = False
    last_lon, last_lat = ring[-1]
    for next_lon, next_lat in ring:
        if (next_lat > lat) != (last_lat > lat):
            crossing = next_lon + (lat - next_lat) * (last_lon - next_lon) / (last_lat - next_lat)
            if lon < crossing:
                inside = not inside
        last_lon, last_lat = next_lon, next_lat
    return inside


def read_boundary(path):
    features = json.loads(path.read_text(encoding="utf-8"))["features"]
    germany = next(feature for feature in features if feature["properties"]["ADM0_A3"] == "DEU")
    geometry = germany["geometry"]
    polygons = geometry["coordinates"]
    return polygons if geometry["type"] == "MultiPolygon" else [polygons]


def collect_stations(path, is_ice, stations):
    with zipfile.ZipFile(path) as feed:
        routes = {}
        for route in read_rows(feed, "routes"):
            name = route["route_short_name"].strip().upper()
            include = ICE.fullmatch(name) if is_ice else not NON_REGIONAL.fullmatch(name)
            if route["route_type"] == "2" and include:
                routes[route["route_id"]] = (route["agency_id"], name)

        trips = {
            trip["trip_id"]: routes[trip["route_id"]]
            for trip in read_rows(feed, "trips")
            if trip["route_id"] in routes
        }
        stops = {stop["stop_id"]: stop for stop in read_rows(feed, "stops")}
        station_routes = defaultdict(set)
        for stop_time in read_rows(feed, "stop_times"):
            route = trips.get(stop_time["trip_id"])
            if route is None or stop_time["pickup_type"] == stop_time["drop_off_type"] == "1":
                continue
            stop = stops[stop_time["stop_id"]]
            station_routes[stop["parent_station"] or stop["stop_id"]].add(route)

        for station_id, served_routes in station_routes.items():
            stop = stops[station_id]
            if station_id not in stations:
                stations[station_id] = {
                    "name": STATION_MODE_PREFIX.sub("", stop["stop_name"]),
                    "lat": round(float(stop["stop_lat"]), 5),
                    "lon": round(float(stop["stop_lon"]), 5),
                    "ice": False,
                    "regionalLines": 0,
                }
            if is_ice:
                stations[station_id]["ice"] = True
            else:
                stations[station_id]["regionalLines"] = len(served_routes)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("long_distance", type=Path, help="GTFS.de Fernverkehr ZIP")
    parser.add_argument("regional", type=Path, help="GTFS.de Regionalverkehr ZIP")
    parser.add_argument("countries", type=Path, help="Natural Earth 1:10m Admin 0 countries GeoJSON")
    args = parser.parse_args()

    polygons = read_boundary(args.countries)
    stations = {}
    collect_stations(args.long_distance, True, stations)
    collect_stations(args.regional, False, stations)

    in_germany = [
        station for station in stations.values()
        if any(
            inside_ring(station["lon"], station["lat"], polygon[0])
            and not any(inside_ring(station["lon"], station["lat"], hole) for hole in polygon[1:])
            for polygon in polygons
        )
    ]
    in_germany.sort(key=lambda station: (station["name"], station["lat"], station["lon"]))
    data = {
        "boundary": {"type": "MultiPolygon", "coordinates": polygons},
        "stations": in_germany,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(in_germany)} Bahnhöfe, davon {sum(station['ice'] for station in in_germany)} mit ICE-Halt")


if __name__ == "__main__":
    main()
