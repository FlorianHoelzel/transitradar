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
        console.log("Loading vehicles from API.");
        return await loadVehicleMovementsFromRemoteApi(bounds, zoom);
    } catch (apiError) {
        console.warn(`Failed to load live vehicles from ${CITY_CONFIG.network} API:`, apiError);
        return [];
    }
}

export async function loadCityVehicleMovements(zoom) {
    try {
        console.log("Loading citywide vehicles from API.");
        return await getCityVehicleMovementsGrid(zoom);
    } catch (apiError) {
        console.warn(`Failed to load citywide live vehicles from ${CITY_CONFIG.network} API:`, apiError);
        return null;
    }
}
