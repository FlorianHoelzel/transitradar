import { getDepartures } from "../api/transitApi.js";
import { CITY_CONFIG } from "../config.js";

export async function loadDeparturesForStation(station) {
    try {
        return await getDepartures(station);
    } catch (apiError) {
        console.warn(`Failed to load departures from ${CITY_CONFIG.network} API:`, apiError);
        return [];
    }
}
