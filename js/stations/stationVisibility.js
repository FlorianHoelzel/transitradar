import { STATION_MARKER_LIMIT } from "../config.js";
import {
    shouldShowStation,
    matchesActiveStationFilter
} from "./stationUtils.js";

export function getVisibleStations(stations, bounds, zoom, limit = STATION_MARKER_LIMIT) {
    return stations
        .filter(station => {
            return (
                bounds.contains(station.coordinates) &&
                shouldShowStation(station, zoom) &&
                matchesActiveStationFilter(station)
            );
        })
        .slice(0, limit);
}