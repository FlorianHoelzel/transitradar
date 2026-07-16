import {
    getCityVehicleMovementsGrid,
    getVehicleMovements
} from "../api/transitApi.js";
import { CITY_CONFIG } from "../config.js";

async function loadVehicleMovementsFromRemoteApi(bounds, zoom) {
    return await getVehicleMovements(bounds, zoom);
}

export async function loadVehicleMovements(bounds, zoom) {
    try {
        console.log("Fahrzeuge werden von der API geladen.");
        return await loadVehicleMovementsFromRemoteApi(bounds, zoom);
    } catch (apiError) {
        console.warn(`Live-Fahrzeuge konnten nicht von der ${CITY_CONFIG.network}-API geladen werden:`, apiError);
        return [];
    }
}

export async function loadCityVehicleMovements(zoom) {
    try {
        console.log("Stadtweite Fahrzeugdaten werden von der API geladen.");
        return await getCityVehicleMovementsGrid(zoom);
    } catch (apiError) {
        console.warn(`Stadtweite Live-Fahrzeuge konnten nicht von der ${CITY_CONFIG.network}-API geladen werden:`, apiError);
        return null;
    }
}
