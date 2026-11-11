import { CITY_CONFIG, STATION_CONFIG } from "../config.js";
import { getStationDensityZoomOffset } from "../settings/settingsStore.js";
import { activeFilters } from "../ui/filters.js";
import {
    getStationImportanceScore,
    shouldShowStation,
    matchesActiveStationFilter
} from "./stationUtils.js";

function getMarkerLimitForZoom(zoom) {
    const effectiveZoom = zoom + getStationDensityZoomOffset();

    if (effectiveZoom < STATION_CONFIG.zoomLevels.rapidTransit) {
        return STATION_CONFIG.markerLimits.importantRapidTransit;
    }

    if (effectiveZoom < STATION_CONFIG.zoomLevels.surfaceTransit) {
        return STATION_CONFIG.markerLimits.rapidTransit;
    }

    if (effectiveZoom < STATION_CONFIG.zoomLevels.allStations) {
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
    if (CITY_CONFIG.id === "db") {
        const effectiveZoom = zoom + getStationDensityZoomOffset();
        const minimumLines = effectiveZoom >= 10 ? 1 : effectiveZoom >= 8 ? 2 : effectiveZoom >= 7 ? 4 : 6;
        const { longDistance, regional } = activeFilters.stations;
        return stations.filter(station => bounds.contains(station.coordinates) &&
            ((longDistance && station.ice) || (regional && station.regionalLines >= minimumLines)))
            .sort((a, b) => Number(b.ice) - Number(a.ice) || b.regionalLines - a.regionalLines)
            .slice(0, 800);
    }

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
