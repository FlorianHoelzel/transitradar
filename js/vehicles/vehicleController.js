import { showRouteForTrip, clearRouteLayer } from "../map/routeLayer.js";
import { map } from "../map/map.js";
import { VEHICLE_CONFIG } from "../config.js";

import { vehicleState } from "./vehicleState.js";
import { loadVehicleMovements } from "./vehicleService.js";
import {
    updateVehicleMarkerStyles,
    updateSelectedLineControl
} from "./vehicleUI.js";
import {
    clearVehicleMarkers,
    renderVehicleMovements
} from "./vehicleRenderer.js";

export { clearVehicleMarkers };

export function clearSelectedLine() {
    vehicleState.selectedLineName = null;
    clearRouteLayer();

    updateVehicleMarkerStyles();

    updateSelectedLineControl(() => {
        clearSelectedLine();
        updateVehicles(true);
    });
}

function selectLineFromMovement(movement) {
    const lineName = movement.line?.name;

    if (!lineName) {
        return;
    }

    if (vehicleState.selectedLineName === lineName) {
        clearSelectedLine();
        return;
    }

    vehicleState.selectedLineName = lineName;

    showRouteForTrip(movement.tripId, lineName).then(() => {
        updateVehicleMarkerStyles();
    });

    updateVehicleMarkerStyles();

    updateSelectedLineControl(() => {
        clearSelectedLine();
        updateVehicles(true);
    });

    updateVehicles(true);
}

export async function updateVehicles(force = false) {
    const zoom = map.getZoom();

    if (zoom < VEHICLE_CONFIG.zoomThreshold) {
        vehicleState.updateRequestId += 1;
        clearVehicleMarkers();
        return;
    }

    const now = Date.now();

    if (vehicleState.updateRunning) {
        return;
    }

    if (!force && now - vehicleState.lastUpdate < vehicleState.minimumUpdateInterval) {
        return;
    }

    vehicleState.updateRunning = true;
    vehicleState.lastUpdate = now;
    const requestId = vehicleState.updateRequestId + 1;
    vehicleState.updateRequestId = requestId;

    try {
        const bounds = map.getBounds();
        const movements = await loadVehicleMovements(bounds, zoom);
        const currentZoom = map.getZoom();

        if (
            requestId !== vehicleState.updateRequestId ||
            currentZoom < VEHICLE_CONFIG.zoomThreshold
        ) {
            clearVehicleMarkers();
            return;
        }

        renderVehicleMovements(movements, selectLineFromMovement, currentZoom);
    } catch (error) {
        console.error("Fehler beim Laden der Fahrzeuge:", error);
    } finally {
        vehicleState.updateRunning = false;
    }
}
