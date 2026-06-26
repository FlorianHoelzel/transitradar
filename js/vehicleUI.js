import { createLineBadge } from "./badges.js";
import { vehicleMarkers, vehicleState } from "./vehicleState.js";
import { cleanStopName, getLineColor } from "./vehicleUtils.js";

function getStopName(stopover) {
    return cleanStopName(
        stopover?.stop?.name ||
        stopover?.name ||
        ""
    );
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

    const nextStops = stopovers.slice(1, 4);
    const destinationStop = stopovers[stopovers.length - 1];

    const destinationName = getStopName(destinationStop);

    return `
        <div class="vehicle-timeline">
            ${createMiddleStopsHtml(nextStops, lineColor)}

            <div class="vehicle-destination-stop">
                <div
                    class="vehicle-destination-dot"
                    style="--line-color: ${lineColor};"
                ></div>

                <div>
                    <div class="vehicle-destination-label">Destination</div>
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
    const nextStops = createVehicleStopsHtml(movement.nextStopovers, lineColor);

    return `
        <div class="vehicle-popup">
            <div class="vehicle-popup-line">
                ${createLineBadge(lineName)}
            </div>

            <div class="vehicle-popup-direction">
                Richtung ${cleanStopName(movement.direction) || "Unbekannt"}
            </div>

            ${
                nextStops
                    ? `
                        <div class="vehicle-popup-title">
                            Next stops
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

        if (!movement) return;

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
        <button class="selected-line-clear">Clear</button>
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
            <span>Selected line</span>
            ${createLineBadge(vehicleState.selectedLineName)}
        `;

    vehicleState.selectedLineControl.classList.add("visible");
}