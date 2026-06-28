import { VEHICLE_CONFIG } from "../config.js";

export const vehicleState = {
    updateRunning: false,
    lastUpdate: 0,

    selectedLineName: null,
    selectedLineControl: null,

    refreshInterval: VEHICLE_CONFIG.refreshInterval,
    minimumUpdateInterval: VEHICLE_CONFIG.minimumUpdateInterval
};