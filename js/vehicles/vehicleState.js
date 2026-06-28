import {
    VEHICLE_REFRESH_INTERVAL,
    VEHICLE_MINIMUM_UPDATE_INTERVAL
} from "../config.js";

export const vehicleState = {
    updateRunning: false,
    lastUpdate: 0,

    selectedLineName: null,
    selectedLineControl: null,

    refreshInterval: VEHICLE_REFRESH_INTERVAL,
    minimumUpdateInterval: VEHICLE_MINIMUM_UPDATE_INTERVAL
};