export function getDisplayStationName(station) {
    return station.name
        .replace(/\s+\(Berlin\)$/u, "")
        .trim();
}

export function getSearchStationName(station) {
    return getDisplayStationName(station)
        .replace(/^(?:S\+U|S|U)\s+/u, "")
        .trim();
}
