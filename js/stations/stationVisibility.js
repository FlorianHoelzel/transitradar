import { STATION_CONFIG } from "../config.js";
import {
    getStationImportanceScore,
    shouldShowStation,
    matchesActiveStationFilter
} from "./stationUtils.js";

function getMarkerLimitForZoom(zoom) {
    if (zoom < STATION_CONFIG.zoomLevels.rapidTransit) {
        return STATION_CONFIG.markerLimits.importantRapidTransit;
    }

    if (zoom < STATION_CONFIG.zoomLevels.surfaceTransit) {
        return STATION_CONFIG.markerLimits.rapidTransit;
    }

    if (zoom < STATION_CONFIG.zoomLevels.allStations) {
        return STATION_CONFIG.markerLimits.surfaceTransit;
    }

    return STATION_CONFIG.markerLimits.allStations;
}

export function getVisibleStations(
    stations,
    bounds,
    zoom,
    limit = getMarkerLimitForZoom(zoom)
) {
    return stations
        .filter(station => {
            return (
                bounds.contains(station.coordinates) &&
                shouldShowStation(station, zoom) &&
                matchesActiveStationFilter(station)
            );
        })
        .sort((a, b) => {
            return getStationImportanceScore(b) - getStationImportanceScore(a);
        })
        .slice(0, limit);
}
