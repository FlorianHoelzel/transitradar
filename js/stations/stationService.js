import { loadStationsFromLocalData } from "./localStationRepository.js";
import { BERLIN_BOUNDS } from "../config.js";

function isBerlinAreaStation(station) {
    const [lat, lng] = station.coordinates;

    return (
        lat >= BERLIN_BOUNDS.minLat &&
        lat <= BERLIN_BOUNDS.maxLat &&
        lng >= BERLIN_BOUNDS.minLng &&
        lng <= BERLIN_BOUNDS.maxLng
    );
}

function normalizeStop(stop) {
    return {
        id: stop.id,
        name: stop.name,
        coordinates: [
            stop.location.latitude,
            stop.location.longitude
        ],
        products: stop.products || {}
    };
}

function createEmptyProducts() {
    return {
        subway: false,
        suburban: false,
        tram: false,
        bus: false,
        ferry: false,
        express: false,
        regional: false
    };
}

function mergeProducts(targetProducts, sourceProducts) {
    Object.keys(targetProducts).forEach(product => {
        targetProducts[product] =
            targetProducts[product] || sourceProducts[product] === true;
    });
}

function groupStationsByName(rawStations) {
    const groupedStations = {};

    rawStations.forEach(station => {
        if (!groupedStations[station.name]) {
            groupedStations[station.name] = {
                name: station.name,
                coordinates: station.coordinates,
                products: createEmptyProducts(),
                stops: []
            };
        }

        groupedStations[station.name].stops.push({
            id: station.id,
            coordinates: station.coordinates,
            products: station.products
        });

        mergeProducts(groupedStations[station.name].products, station.products);
    });

    return Object.values(groupedStations);
}

function prepareStations(rawStops) {
    const rawStations = rawStops
        .map(normalizeStop)
        .filter(isBerlinAreaStation);

    return groupStationsByName(rawStations);
}

export async function loadStations() {
    try {
        console.log("Loading stations from local cache.");
        const data = await loadStationsFromLocalData();

        return prepareStations(data);
    } catch (error) {
        console.error("Failed to load stations from local cache:", error);
        return [];
    }
}