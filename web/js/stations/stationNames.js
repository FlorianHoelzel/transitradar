import { CITY_CONFIG } from "../config.js";

export function getDisplayStationName(station) {
    return station.name
        .replace(new RegExp(`\\s+\\(${CITY_CONFIG.name}\\)$`, "u"), "")
        .trim();
}

export function getSearchStationName(station) {
    return getDisplayStationName(station)
        .replace(/^(?:S\+U|S|U)\s+/u, "")
        .trim();
}
