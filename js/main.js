import { loadStationsFromApi } from "./api.js";
import { map, updateVisibleMarkers } from "./map.js";
import { setupSearch } from "./search.js";

let stations = [];

async function loadStations() {
    const data = await loadStationsFromApi();

    const rawStations = data
        .map(stop => {
            return {
                id: stop.id,
                name: stop.name,
                coordinates: [
                    stop.location.latitude,
                    stop.location.longitude
                ]
            };
        })
        .filter(station => {
            const lat = station.coordinates[0];
            const lng = station.coordinates[1];

            return lat >= 52.33 && lat <= 52.70 &&
                   lng >= 13.05 && lng <= 13.80;
        });

    const groupedStations = {};

    rawStations.forEach(station => {
        if (!groupedStations[station.name]) {
            groupedStations[station.name] = {
                name: station.name,
                coordinates: station.coordinates,
                stops: []
            };
        }

        groupedStations[station.name].stops.push({
            id: station.id,
            coordinates: station.coordinates
        });
    });

    stations = Object.values(groupedStations);

    updateVisibleMarkers(stations);
    setupSearch(stations);
}

loadStations();

map.on("moveend", () => {
    updateVisibleMarkers(stations);
});