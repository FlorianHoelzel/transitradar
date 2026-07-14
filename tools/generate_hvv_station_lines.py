import argparse
import csv
import json
import math
import re
from collections import defaultdict
from pathlib import Path


def station_group_id(stop):
    return stop.get("parent_station") or stop["stop_id"].split("::", 1)[0]


def distance_meters(a_lat, a_lon, b_lat, b_lon):
    lat_scale = 111_320
    lon_scale = lat_scale * math.cos(math.radians((a_lat + b_lat) / 2))
    return math.hypot((a_lat - b_lat) * lat_scale, (a_lon - b_lon) * lon_scale)


def line_sort_key(name):
    return [int(part) if part.isdigit() else part.casefold()
            for part in re.split(r"(\d+)", name)]


def normalize_station_name(name):
    value = name.casefold().strip()
    if "," in value:
        value = value.split(",", 1)[1].strip()
    value = re.sub(r"^(?:(?:s\+u|u\+s|s|u|a|bf\.)\s+)+", "", value)
    value = re.sub(r"\s*\([^)]*\)\s*", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def read_csv(path):
    return csv.DictReader(path.open("r", encoding="utf-8-sig", newline=""))


def build_catalog(gtfs_dir, geofox_stations):
    routes = {
        row["route_id"]: row["route_short_name"].strip()
        for row in read_csv(gtfs_dir / "routes.txt")
        if row["route_short_name"].strip()
    }
    trip_lines = {
        row["trip_id"]: routes.get(row["route_id"])
        for row in read_csv(gtfs_dir / "trips.txt")
    }

    stop_groups = {}
    stop_to_group = {}
    for stop in read_csv(gtfs_dir / "stops.txt"):
        group_id = station_group_id(stop)
        stop_to_group[stop["stop_id"]] = group_id
        group = stop_groups.setdefault(group_id, {
            "latitudes": [], "longitudes": [], "lines": set(), "names": set()
        })
        group["names"].add(normalize_station_name(stop["stop_name"]))
        if stop.get("stop_lat") and stop.get("stop_lon"):
            group["latitudes"].append(float(stop["stop_lat"]))
            group["longitudes"].append(float(stop["stop_lon"]))

    for stop_time in read_csv(gtfs_dir / "stop_times.txt"):
        line = trip_lines.get(stop_time["trip_id"])
        group_id = stop_to_group.get(stop_time["stop_id"])
        if line and group_id:
            stop_groups[group_id]["lines"].add(line)

    grid = defaultdict(list)
    for group in stop_groups.values():
        if not group["latitudes"] or not group["lines"]:
            continue
        group["latitude"] = sum(group["latitudes"]) / len(group["latitudes"])
        group["longitude"] = sum(group["longitudes"]) / len(group["longitudes"])
        cell = (round(group["latitude"] * 100), round(group["longitude"] * 100))
        grid[cell].append(group)

    catalog = {}
    for station in geofox_stations:
        location = station.get("location") or {}
        latitude = location.get("latitude")
        longitude = location.get("longitude")
        if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
            continue

        row = round(latitude * 100)
        column = round(longitude * 100)
        candidates = [
            group
            for row_offset in (-1, 0, 1)
            for column_offset in (-1, 0, 1)
            for group in grid.get((row + row_offset, column + column_offset), [])
        ]
        if not candidates:
            continue

        station_name = normalize_station_name(station["name"])
        matching_groups = [
            group for group in candidates
            if station_name in group["names"] and distance_meters(
                latitude, longitude, group["latitude"], group["longitude"]
            ) <= 500
        ]

        if matching_groups:
            lines = set().union(*(group["lines"] for group in matching_groups))
            catalog[station["id"]] = sorted(lines, key=line_sort_key)
            continue

        nearest = min(candidates, key=lambda group: distance_meters(
            latitude, longitude, group["latitude"], group["longitude"]
        ))
        if distance_meters(latitude, longitude, nearest["latitude"], nearest["longitude"]) <= 350:
            catalog[station["id"]] = sorted(nearest["lines"], key=line_sort_key)

    return catalog


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("gtfs_dir", type=Path)
    parser.add_argument("geofox_stations", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    stations = json.loads(args.geofox_stations.read_text(encoding="utf-8-sig"))
    catalog = build_catalog(args.gtfs_dir, stations)
    output = (
        "// Generated from the official HVV GTFS schedule published 2026-07-09.\n"
        "// Source: Transparenzportal Hamburg; attribution: Hamburger Verkehrsverbund GmbH.\n"
        "// License: Datenlizenz Deutschland – Namensnennung – Version 2.0.\n"
        "// Regenerate with tools/generate_hvv_station_lines.py.\n"
        f"export const STATION_LINES_BY_ID = {json.dumps(catalog, ensure_ascii=False, indent=2)};\n"
    )
    args.output.write_text(output, encoding="utf-8", newline="\n")
    print(f"Generated {len(catalog)} station line entries.")


if __name__ == "__main__":
    main()
