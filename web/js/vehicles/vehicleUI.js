import { createLineBadge } from "../lines/badges.js";
import { activeTripDetails } from "../map/routeLayer.js";
import { vehicleState } from "./vehicleState.js";
import { vehicleMarkers } from "./vehicleStore.js";
import { cleanStopName, getLineColor } from "./vehicleUtils.js";

function getStopName(stopover) {
    return cleanStopName(
        stopover?.stop?.name ||
        stopover?.name ||
        ""
    );
}

function getStopTime(stopover) {
    return (
        stopover?.departure ||
        stopover?.arrival ||
        stopover?.plannedDeparture ||
        stopover?.plannedArrival ||
        null
    );
}

function isStopInPast(stopover) {
    const time = getStopTime(stopover);

    if (!time) {
        return false;
    }

    return new Date(time).getTime() < Date.now() - 60_000;
}

function removeInvalidStops(stopovers) {
    return stopovers.filter(stopover => {
        return getStopName(stopover) !== "";
    });
}

function removePastStops(stopovers) {
    return stopovers.filter(stopover => {
        return !isStopInPast(stopover);
    });
}

function removeDuplicateStops(stopovers) {
    const seenStops = new Set();

    return stopovers.filter(stopover => {
        const name = getStopName(stopover);

        if (seenStops.has(name)) {
            return false;
        }

        seenStops.add(name);
        return true;
    });
}

function normalizeStopovers(stopovers) {
    return removeDuplicateStops(
        removePastStops(
            removeInvalidStops(stopovers)
        )
    );
}

function getDestinationStop(stopovers) {
    return stopovers[stopovers.length - 1];
}

function getNextStops(stopovers, destinationStop) {
    const cleanStopovers = normalizeStopovers(stopovers);
    const destinationName = getStopName(destinationStop);

    const stopsBeforeDestination = cleanStopovers.filter(stopover => {
        return getStopName(stopover) !== destinationName;
    });

    return stopsBeforeDestination.slice(0, 3);
}

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

function createMiddleStopsHtml(stops, lineColor) {
    return stops
        .map((stopover, index) => {
            const name = getStopName(stopover);

            return `
                <div class="vehicle-stop">
                    <div
                        class="vehicle-stop-icon"
                        style="--line-color: ${lineColor};"
                    ></div>

                    <div class="vehicle-stop-name ${index === 0 ? "vehicle-next-stop" : ""}">
                        ${name}
                    </div>
                </div>
            `;
        })
        .join("");
}

export function createVehicleStopsHtml(stopovers, lineColor) {
    if (!stopovers || stopovers.length === 0) {
        return "";
    }

    const cleanStopovers = normalizeStopovers(stopovers);

    if (cleanStopovers.length === 0) {
        return "";
    }

    const destinationStop = getDestinationStop(cleanStopovers);

    if (!destinationStop) {
        return "";
    }

    const destinationName = getStopName(destinationStop);
    const nextStops = getNextStops(cleanStopovers, destinationStop);

    if (nextStops.length === 0) {
        return "";
    }

    return `
        <div class="vehicle-timeline">
            ${createMiddleStopsHtml(nextStops, lineColor)}

            <div class="vehicle-destination-stop">
                <div
                    class="vehicle-destination-dot"
                    style="--line-color: ${lineColor};"
                ></div>

                <div>
                    <div class="vehicle-destination-label">Ziel</div>
                    <div class="vehicle-destination-name">${destinationName}</div>
                </div>
            </div>
        </div>
    `;
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
    const lineColor = getLineColor(lineName);
    const stopovers = getPopupStopovers(movement);
    const nextStops = createVehicleStopsHtml(stopovers, lineColor);

    return `
        <div class="vehicle-popup">
            <div class="vehicle-popup-line">
                ${createLineBadge(lineName)}
            </div>

            <div class="vehicle-popup-direction">
                ${getDirectionLabel(movement)}
            </div>

            ${
                nextStops
                    ? `
                        <div class="vehicle-popup-title">
                            Nächste Haltestellen
                        </div>

                        ${nextStops}
                    `
                    : ""
            }
        </div>
    `;
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
