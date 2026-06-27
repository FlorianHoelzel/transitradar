import { showRouteForTrip, clearRouteLayer } from "./routeLayer.js";
import { getVehicleMovements } from "./api.js";
import { map } from "./map.js";
import { vehicleMarkers, vehicleState } from "./vehicleState.js";
import {
    getRadarBounds,
    shouldShowVehicle,
    animateMarker
} from "./vehicleUtils.js";
import {
    createVehicleIcon,
    createVehiclePopup,
    updateVehicleMarkerStyles,
    updateSelectedLineControl
} from "./vehicleUI.js";

export function clearVehicleMarkers() {
    Object.values(vehicleMarkers).forEach(marker => {
        map.removeLayer(marker);
    });

    Object.keys(vehicleMarkers).forEach(key => {
        delete vehicleMarkers[key];
    });
}

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

function removeOutdatedVehicleMarkers(visibleVehicleIds) {
    Object.keys(vehicleMarkers).forEach(id => {
        const marker = vehicleMarkers[id];

        if (!marker) {
            return;
        }

        if (!visibleVehicleIds.has(id)) {
            map.removeLayer(marker);
            delete vehicleMarkers[id];
        }
    });
}

function updateExistingVehicleMarker(id, movement, coordinates) {
    const marker = vehicleMarkers[id];

    marker.transitMovement = movement;
    animateMarker(marker, coordinates);
    marker.setIcon(createVehicleIcon(movement));
    marker.setPopupContent(createVehiclePopup(movement));
}

function createNewVehicleMarker(id, movement, coordinates) {
    const marker = L.marker(coordinates, {
        icon: createVehicleIcon(movement),
        zIndexOffset: 500
    }).addTo(map);

    marker.transitMovement = movement;
    marker.bindPopup(createVehiclePopup(movement));

    marker.on("click", () => {
        selectLineFromMovement(marker.transitMovement);
    });

    vehicleMarkers[id] = marker;
}

function renderVehicleMovement(movement, visibleVehicleIds) {
    if (!movement.location) {
        return;
    }

    if (!shouldShowVehicle(movement)) {
        return;
    }

    const id = movement.tripId || `${movement.line?.name}-${movement.direction}`;

    if (!id) {
        return;
    }

    visibleVehicleIds.add(id);

    const coordinates = [
        movement.location.latitude,
        movement.location.longitude
    ];

    if (vehicleMarkers[id]) {
        updateExistingVehicleMarker(id, movement, coordinates);
        return;
    }

    createNewVehicleMarker(id, movement, coordinates);
}

export async function updateVehicles(force = false) {
    const zoom = map.getZoom();

    if (zoom < 14 && !vehicleState.selectedLineName) {
        clearVehicleMarkers();
        return;
    }

    const now = Date.now();

    if (vehicleState.updateRunning) {
        return;
    }

    if (!force && now - vehicleState.lastUpdate < 15000) {
        return;
    }

    vehicleState.updateRunning = true;
    vehicleState.lastUpdate = now;

    try {
        const movements = await getVehicleMovements(getRadarBounds());
        const visibleVehicleIds = new Set();

        movements.forEach(movement => {
            renderVehicleMovement(movement, visibleVehicleIds);
        });

        removeOutdatedVehicleMarkers(visibleVehicleIds);
    } catch (error) {
        console.error("Fehler beim Laden der Fahrzeuge:", error);
    } finally {
        vehicleState.updateRunning = false;
    }
}