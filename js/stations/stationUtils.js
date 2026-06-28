import { STATION_CONFIG } from "../config.js";
import { activeFilters } from "../ui/filters.js";

export function isTrainStation(station) {
    const name = station.name.toLowerCase();

    return (
        name.startsWith("s+u ") ||
        name.startsWith("s ") ||
        name.startsWith("u ")
    );
}

export function shouldShowStation(station, zoom) {
    if (zoom < STATION_CONFIG.zoomThreshold) {
        return isTrainStation(station);
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

export function matchesActiveStationFilter(station) {
    const name = station.name.toLowerCase();

    const isSuburban =
        name.startsWith("s ") ||
        name.startsWith("s+u ") ||
        hasProduct(station, "suburban");

    const isSubway =
        name.startsWith("u ") ||
        name.startsWith("s+u ") ||
        hasProduct(station, "subway");

    const isSurface =
        !name.startsWith("s ") &&
        !name.startsWith("u ") &&
        !name.startsWith("s+u ");

    if (isSuburban && activeFilters.stations.suburban) return true;
    if (isSubway && activeFilters.stations.subway) return true;
    if (isSurface && activeFilters.stations.surface) return true;

    return false;
}