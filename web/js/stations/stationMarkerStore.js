export const stationMarkers = {};

export function clearStationMarkers(map) {
    Object.values(stationMarkers).forEach(marker => {
        map.removeLayer(marker);
    });

    Object.keys(stationMarkers).forEach(key => {
        delete stationMarkers[key];
    });
}

export function setStationMarker(stationName, marker) {
    stationMarkers[stationName] = marker;
}

export function getStationMarker(stationName) {
    return stationMarkers[stationName];
}

export function removeStationMarker(stationName, map) {
    const marker = stationMarkers[stationName];

    if (!marker) {
        return;
    }

    map.removeLayer(marker);
    delete stationMarkers[stationName];
}
