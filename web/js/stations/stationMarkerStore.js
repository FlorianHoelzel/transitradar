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