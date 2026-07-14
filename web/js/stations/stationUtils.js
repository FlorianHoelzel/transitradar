import { STATION_CONFIG } from "../config.js";
import { activeFilters } from "../ui/filters.js";
import {
    getImportantStationScoreOffset,
    getStationDensityZoomOffset
} from "../settings/settingsStore.js";
import {
    isSuburbanLine,
    isSubwayLine
} from "./stationLineTypes.js";

function hasLineType(station, predicate) {
    return station.lines?.some(predicate) === true;
}

function getLineCount(station) {
    return station.lines?.length ?? 0;
}

export function isTrainStation(station) {
    const name = station.name.toLowerCase();

    return (
        name.startsWith("s+u ") ||
        name.startsWith("s ") ||
        name.startsWith("u ") ||
        hasProduct(station, "suburban") ||
        hasProduct(station, "subway") ||
        hasLineType(station, isSuburbanLine) ||
        hasLineType(station, isSubwayLine)
    );
}

export function isSurfaceStation(station) {
    return (
        hasProduct(station, "tram") ||
        hasProduct(station, "bus")
    );
}

export function isImportantTrainStation(station) {
    if (!isTrainStation(station)) {
        return false;
    }

    return getStationImportanceScore(station) >=
        STATION_CONFIG.importantStationMinScore + getImportantStationScoreOffset();
}

export function shouldShowStation(station, zoom) {
    const effectiveZoom = zoom + getStationDensityZoomOffset();

    if (effectiveZoom < STATION_CONFIG.zoomLevels.rapidTransit) {
        return isImportantTrainStation(station);
    }

    if (effectiveZoom < STATION_CONFIG.zoomLevels.surfaceTransit) {
        return isTrainStation(station);
    }

    if (effectiveZoom < STATION_CONFIG.zoomLevels.allStations) {
        return isTrainStation(station) || isSurfaceStation(station);
    }

    return true;
}

export function hasProduct(station, productName) {
    if (station.products?.[productName] === true) {
        return true;
    }

    return station.stops?.some(stop => {
        return stop.products?.[productName] === true;
    }) === true;
}

export function getStationImportanceScore(station) {
    let score = 0;

    if (hasProduct(station, "suburban")) score += 3;
    if (hasProduct(station, "subway")) score += 3;
    if (hasProduct(station, "regional")) score += 3;
    if (hasProduct(station, "express")) score += 2;

    if (hasLineType(station, isSuburbanLine)) score += 2;
    if (hasLineType(station, isSubwayLine)) score += 2;
    if (station.name.toLowerCase().startsWith("s+u ")) score += 2;
    if (station.name.toLowerCase().startsWith("u ")) score += 1;

    score += Math.min(getLineCount(station), 6);

    return score;
}

export function matchesActiveStationFilter(station) {
    const name = station.name.toLowerCase();

    const isSuburban =
        name.startsWith("s ") ||
        name.startsWith("s+u ") ||
        hasProduct(station, "suburban") ||
        hasLineType(station, isSuburbanLine);

    const isSubway =
        name.startsWith("u ") ||
        name.startsWith("s+u ") ||
        hasProduct(station, "subway") ||
        hasLineType(station, isSubwayLine);

    const isSurface =
        !isSuburban &&
        !isSubway;

    if (isSuburban && activeFilters.stations.suburban) return true;
    if (isSubway && activeFilters.stations.subway) return true;
    if (isSurface && activeFilters.stations.surface) return true;

    return false;
}
