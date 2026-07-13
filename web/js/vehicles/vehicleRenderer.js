import { map } from "../map/map.js";
import { vehicleMarkers } from "./vehicleStore.js";
import {
    shouldShowVehicle,
    animateMarker,
    getVehicleId
} from "./vehicleUtils.js";
import {
    createVehicleIcon,
    createVehiclePopup
} from "./vehicleUI.js";

export function clearVehicleMarkers() {
    Object.values(vehicleMarkers).forEach(marker => {
        if (marker.animationFrameId) {
            cancelAnimationFrame(marker.animationFrameId);
            marker.animationFrameId = null;
        }

        map.removeLayer(marker);
    });

    Object.keys(vehicleMarkers).forEach(key => {
        delete vehicleMarkers[key];
    });
}

export function getRenderedVehicleMovementsForLine(lineName) {
    return Object.values(vehicleMarkers)
        .map(marker => marker.transitMovement)
        .filter(movement => movement?.line?.name === lineName);
}

function removeOutdatedVehicleMarkers(visibleVehicleIds) {
    Object.keys(vehicleMarkers).forEach(id => {
        const marker = vehicleMarkers[id];

        if (!marker) {
            return;
        }

        if (!visibleVehicleIds.has(id)) {
            if (marker.animationFrameId) {
                cancelAnimationFrame(marker.animationFrameId);
                marker.animationFrameId = null;
            }

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

function createNewVehicleMarker(id, movement, coordinates, onVehicleClick) {
    const marker = L.marker(coordinates, {
        icon: createVehicleIcon(movement),
        zIndexOffset: 500
    }).addTo(map);

    marker.transitMovement = movement;

    marker.bindPopup(createVehiclePopup(movement), {
        closeButton: false
    });

    marker.on("click", () => {
        onVehicleClick(marker.transitMovement);
    });

    vehicleMarkers[id] = marker;
}

function renderVehicleMovement(
    movement,
    visibleVehicleIds,
    onVehicleClick,
    zoom,
    selectedLineName
) {
    if (!movement.location) {
        return;
    }

    if (!shouldShowVehicle(movement, zoom, selectedLineName)) {
        return;
    }

    const id = getVehicleId(movement);

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

    createNewVehicleMarker(id, movement, coordinates, onVehicleClick);
}

export function renderVehicleMovements(
    movements,
    onVehicleClick,
    zoom,
    selectedLineName = null
) {
    const visibleVehicleIds = new Set();

    movements.forEach(movement => {
        renderVehicleMovement(
            movement,
            visibleVehicleIds,
            onVehicleClick,
            zoom,
            selectedLineName
        );
    });

    removeOutdatedVehicleMarkers(visibleVehicleIds);
}
