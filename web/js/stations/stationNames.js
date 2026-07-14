import { CITY_CONFIG } from "../config.js";

export function getDisplayStationName(station) {
    const displayName = station.name
        .replace(new RegExp(`\\s+\\(${CITY_CONFIG.name}\\)$`, "u"), "")
        .trim();

    if (CITY_CONFIG.id !== "frankfurt") {
        return displayName;
    }

    return displayName
        .replace(/^Frankfurt\s*\(Main\)\s*,?\s*/iu, "")
        .trim();
}

export function getSearchStationName(station) {
    return getDisplayStationName(station)
        .replace(/^(?:S\+U|S|U)\s+/u, "")
        .trim();
}
