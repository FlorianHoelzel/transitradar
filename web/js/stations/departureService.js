import { getDepartures } from "../api/transitApi.js";
import { CITY_CONFIG } from "../config.js";

const pendingDepartures = new Map();

function getStationRequestKey(station) {
    const stopIds = (station.stops || [])
        .map(stop => stop.id)
        .filter(Boolean)
        .sort();

    return stopIds.join(",") || station.id || station.name;
}

export async function loadDeparturesForStation(station) {
    const requestKey = getStationRequestKey(station);

    if (pendingDepartures.has(requestKey)) {
        return await pendingDepartures.get(requestKey);
    }

    const request = getDepartures(station)
        .catch(apiError => {
            console.warn(
                `Failed to load departures from ${CITY_CONFIG.network} API:`,
                apiError
            );
            return [];
        })
        .finally(() => {
            pendingDepartures.delete(requestKey);
        });

    pendingDepartures.set(requestKey, request);
    return await request;
}
