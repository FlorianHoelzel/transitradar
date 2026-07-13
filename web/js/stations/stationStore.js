export const stationStore = {
    stations: []
};

export function setStations(stations) {
    stationStore.stations = stations;

    window.dispatchEvent(new CustomEvent("stationsUpdated"));
}

export function getStations() {
    return stationStore.stations;
}
