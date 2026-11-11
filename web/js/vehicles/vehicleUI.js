import { createLineBadge } from "../lines/badges.js";
import { activeTripDetails } from "../map/routeLayer.js";
import { vehicleState } from "./vehicleState.js";
import { vehicleMarkers } from "./vehicleStore.js";
import { cleanStopName, getLineColor } from "./vehicleUtils.js";
import {
    createVehiclePopupContent,
    createVehicleStopsHtml,
    normalizeStopovers
} from "./vehiclePopupContent.js";

export { createVehicleStopsHtml } from "./vehiclePopupContent.js";

function getPopupStopovers(movement) {
    const radarStopovers = movement.nextStopovers || [];

    if (normalizeStopovers(radarStopovers).length >= 4) {
        return radarStopovers;
    }

    const trip = activeTripDetails?.trip || activeTripDetails;

    if (
        trip?.id === movement.tripId &&
        Array.isArray(trip.stopovers) &&
        trip.stopovers.length > radarStopovers.length
    ) {
        return trip.stopovers;
    }

    return radarStopovers;
}

function getDisplayDirection(movement) {
    const lineName = movement.line?.name || "";
    const direction = cleanStopName(movement.direction) || "Unbekannt";

    if (lineName === "S41") {
        return "Ringbahn ↻";
    }

    if (lineName === "S42") {
        return "Ringbahn ↺";
    }

    return direction;
}

function getDirectionLabel(movement) {
    const lineName = movement.line?.name || "";
    const direction = getDisplayDirection(movement);

    if (lineName === "S41" || lineName === "S42") {
        return direction;
    }

    return `Richtung ${direction}`;
}

export function createVehicleIcon(movement) {
    const lineName = movement.line?.name || "?";
    const badge = createLineBadge(lineName);

    let highlightClass = "";

    if (vehicleState.selectedLineName) {
        highlightClass = lineName === vehicleState.selectedLineName
            ? "vehicle-selected"
            : "vehicle-dimmed";
    }

    return L.divIcon({
        className: `vehicle-marker ${highlightClass}`,
        html: `
            <div class="vehicle-badge">
                ${badge}
            </div>
        `,
        iconSize: [44, 28],
        iconAnchor: [22, 14],
        popupAnchor: [0, -14]
    });
}

export function createVehiclePopup(movement) {
    const lineName = movement.line?.name || "?";
    const stops = createVehicleStopsHtml(getPopupStopovers(movement), getLineColor(lineName));
    return createVehiclePopupContent(lineName, getDirectionLabel(movement), stops);
}

export function updateVehicleMarkerStyles() {
    Object.values(vehicleMarkers).forEach(marker => {
        const movement = marker.transitMovement;

        if (!movement) {
            return;
        }

        marker.setIcon(createVehicleIcon(movement));
        marker.setPopupContent(createVehiclePopup(movement));
    });
}

export function createSelectedLineControl(onClear) {
    if (vehicleState.selectedLineControl) {
        return;
    }

    vehicleState.selectedLineControl = document.createElement("div");
    vehicleState.selectedLineControl.className = "selected-line-control";
    vehicleState.selectedLineControl.innerHTML = `
        <div class="selected-line-label"></div>
        <button class="selected-line-clear">Aufheben</button>
    `;

    document.body.appendChild(vehicleState.selectedLineControl);

    vehicleState.selectedLineControl
        .querySelector(".selected-line-clear")
        .addEventListener("click", onClear);
}

export function updateSelectedLineControl(onClear) {
    createSelectedLineControl(onClear);

    if (!vehicleState.selectedLineName) {
        vehicleState.selectedLineControl.classList.remove("visible");
        return;
    }

    vehicleState.selectedLineControl
        .querySelector(".selected-line-label")
        .innerHTML = `
            <span>Ausgewählte Linie</span>
            ${createLineBadge(vehicleState.selectedLineName)}
        `;

    vehicleState.selectedLineControl.classList.add("visible");
}
