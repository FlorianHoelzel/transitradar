import { STATION_CONFIG } from "../config.js";
import {
    shouldShowStation,
    matchesActiveStationFilter
} from "./stationUtils.js";

export function getVisibleStations(
    stations,
    bounds,
    zoom,
    limit = STATION_CONFIG.markerLimit
) {
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