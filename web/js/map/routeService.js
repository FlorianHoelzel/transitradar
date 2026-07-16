import { getTripDetails } from "../api/transitApi.js";
import { CITY_CONFIG } from "../config.js";

async function loadTripFromRemoteApi(tripId, lineName) {
    return await getTripDetails(tripId, lineName);
}

export async function loadTripDetails(tripId, lineName) {
    try {
        console.log("Fahrt wird von der API geladen.");
        return await loadTripFromRemoteApi(tripId, lineName);
    } catch (apiError) {
        console.warn(`Fahrt konnte nicht von der ${CITY_CONFIG.network}-API geladen werden:`, apiError);
        return null;
    }
}
