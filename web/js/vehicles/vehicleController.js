import { showRouteForTrip, clearRouteLayer } from "../map/routeLayer.js";
import { map } from "../map/map.js";
import { CITY_CONFIG, VEHICLE_CONFIG } from "../config.js";

import { vehicleState } from "./vehicleState.js";
import {
    loadCityVehicleMovements,
    loadVehicleMovements
} from "./vehicleService.js";
import {
    updateVehicleMarkerStyles,
    updateSelectedLineControl
} from "./vehicleUI.js";
import {
    clearVehicleMarkers,
    getRenderedVehicleMovementsForLine,
    renderVehicleMovements
} from "./vehicleRenderer.js";
import { getVehicleId } from "./vehicleUtils.js";
import { getSettings } from "../settings/settingsStore.js";

export { clearVehicleMarkers };

let selectedLineCacheName = null;
let selectedLineMovementCache = new Map();

function resetSelectedLineMovementCache(lineName = null) {
    selectedLineCacheName = lineName;
    selectedLineMovementCache = new Map();
}

function addSelectedLineMovementsToCache(movements, lineName) {
    if (!lineName) {
        return;
    }

    if (selectedLineCacheName !== lineName) {
        resetSelectedLineMovementCache(lineName);
    }

    movements
        .filter(movement => movement?.line?.name === lineName)
        .forEach(movement => {
            const id = getVehicleId(movement);

            if (id) {
                selectedLineMovementCache.set(id, movement);
            }
        });
}

function replaceSelectedLineMovementCache(movements, lineName) {
    resetSelectedLineMovementCache(lineName);
    addSelectedLineMovementsToCache(movements, lineName);
}

function getSelectedLineMovementCache(lineName) {
    if (selectedLineCacheName !== lineName) {
        return [];
    }

    return [...selectedLineMovementCache.values()];
}

export function clearSelectedLine() {
    vehicleState.selectedLineName = null;
    resetSelectedLineMovementCache();
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

    vehicleState.selectedLineName = lineName;
    replaceSelectedLineMovementCache(
        [
            movement,
            ...getRenderedVehicleMovementsForLine(lineName)
        ],
        lineName
    );

    showRouteForTrip(movement.routeId || movement.tripId, lineName).then(() => {
        updateVehicleMarkerStyles();
    });

    updateVehicleMarkerStyles();

    updateSelectedLineControl(() => {
        clearSelectedLine();
        updateVehicles(true);
    });

    updateVehicles(true);
}

function getMovementsForSelectedLine(movements, selectedLineName) {
    if (!selectedLineName) {
        return movements;
    }

    return movements.filter(movement => {
        return movement.line?.name === selectedLineName;
    });
}

function renderSelectedLineMovements(
    movements,
    selectedLineName,
    zoom
) {
    if (movements.length === 0) {
        updateVehicleMarkerStyles();
        return;
    }

    renderVehicleMovements(
        movements,
        selectLineFromMovement,
        zoom,
        selectedLineName
    );
}

export async function updateVehicles(force = false) {
    if (!CITY_CONFIG.supportsLiveVehicles || !getSettings().showVehicles) {
        vehicleState.updateRequestId += 1;
        clearVehicleMarkers();
        return;
    }

    const zoom = map.getZoom();
    const selectedLineName = vehicleState.selectedLineName;

    if (zoom < VEHICLE_CONFIG.zoomThreshold && !selectedLineName) {
        vehicleState.updateRequestId += 1;
        clearVehicleMarkers();
        return;
    }

    const now = Date.now();

    if (vehicleState.updateRunning) {
        if (force) {
            vehicleState.pendingUpdate = true;
        }

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
        const requestZoom = selectedLineName
            ? Math.max(zoom, VEHICLE_CONFIG.zoomThreshold)
            : zoom;
        const movements = selectedLineName
            ? await loadCityVehicleMovements(requestZoom)
            : await loadVehicleMovements(map.getBounds(), requestZoom);
        const currentZoom = map.getZoom();
        const currentSelectedLineName = vehicleState.selectedLineName;

        if (selectedLineName !== currentSelectedLineName) {
            return;
        }

        if (
            requestId !== vehicleState.updateRequestId ||
            (currentZoom < VEHICLE_CONFIG.zoomThreshold && !currentSelectedLineName)
        ) {
            clearVehicleMarkers();
            return;
        }

        if (currentSelectedLineName && movements === null) {
            renderSelectedLineMovements(
                getSelectedLineMovementCache(currentSelectedLineName),
                currentSelectedLineName,
                currentZoom
            );
            return;
        }

        const visibleMovements = getMovementsForSelectedLine(
            movements,
            currentSelectedLineName
        );

        if (!currentSelectedLineName) {
            renderVehicleMovements(
                visibleMovements,
                selectLineFromMovement,
                currentZoom,
                currentSelectedLineName
            );
            return;
        }

        if (currentSelectedLineName && visibleMovements.length === 0) {
            console.warn(
                `Keine stadtweiten Live-Fahrzeuge für ${currentSelectedLineName} erhalten. ` +
                "Keeping existing selected-line markers."
            );
            renderSelectedLineMovements(
                getSelectedLineMovementCache(currentSelectedLineName),
                currentSelectedLineName,
                currentZoom
            );
            return;
        }

        replaceSelectedLineMovementCache(
            visibleMovements,
            currentSelectedLineName
        );

        renderSelectedLineMovements(
            getSelectedLineMovementCache(currentSelectedLineName),
            currentSelectedLineName,
            currentZoom
        );
    } catch (error) {
        console.error("Fehler beim Laden der Fahrzeuge:", error);
    } finally {
        const shouldRunPendingUpdate = vehicleState.pendingUpdate;

        vehicleState.pendingUpdate = false;
        vehicleState.updateRunning = false;

        if (shouldRunPendingUpdate) {
            updateVehicles(true);
        }
    }
}
