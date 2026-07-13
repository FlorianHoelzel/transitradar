import { STATION_CONFIG } from "../config.js";
import { activeFilters } from "../ui/filters.js";

function hasLinePrefix(station, prefixes) {
    return station.lines?.some(line => {
        return prefixes.some(prefix => line?.startsWith(prefix));
    }) === true;
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
        hasLinePrefix(station, ["S", "U"])
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

    return getStationImportanceScore(station) >= 6;
}

export function shouldShowStation(station, zoom) {
    if (zoom < STATION_CONFIG.zoomLevels.rapidTransit) {
        return isImportantTrainStation(station);
    }

    if (zoom < STATION_CONFIG.zoomLevels.surfaceTransit) {
        return isTrainStation(station);
    }

    if (zoom < STATION_CONFIG.zoomLevels.allStations) {
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

    if (hasLinePrefix(station, ["S"])) score += 2;
    if (hasLinePrefix(station, ["U"])) score += 2;
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
        hasLinePrefix(station, ["S"]);

    const isSubway =
        name.startsWith("u ") ||
        name.startsWith("s+u ") ||
        hasProduct(station, "subway") ||
        hasLinePrefix(station, ["U"]);

    const isSurface =
        !isSuburban &&
        !isSubway;

    if (isSuburban && activeFilters.stations.suburban) return true;
    if (isSubway && activeFilters.stations.subway) return true;
    if (isSurface && activeFilters.stations.surface) return true;

    return false;
}
