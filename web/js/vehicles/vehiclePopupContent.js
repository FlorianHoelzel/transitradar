import { createLineBadge } from "../lines/badges.js";
import { escapeHtml } from "../ui/escapeHtml.js";
import { cleanStopName } from "./vehicleUtils.js";

function getStopName(stopover) {
    return cleanStopName(stopover?.stop?.name || stopover?.name || "");
}

export function normalizeStopovers(stopovers) {
    const cutoff = Date.now() - 60_000;
    const seen = new Set();

    return stopovers.filter(stopover => {
        const name = getStopName(stopover);
        const time = stopover?.departure || stopover?.arrival ||
            stopover?.plannedDeparture || stopover?.plannedArrival;
        if (!name || (time && new Date(time).getTime() < cutoff) || seen.has(name)) return false;
        seen.add(name);
        return true;
    });
}

export function createVehicleStopsHtml(stopovers, lineColor, { showDestinationOnly = false } = {}) {
    const stops = normalizeStopovers(stopovers || []);
    if (!stops.length || (stops.length === 1 && !showDestinationOnly)) return "";

    const destinationName = getStopName(showDestinationOnly ? stopovers.at(-1) : stops.at(-1));
    const nextStops = stops.filter(stop => getStopName(stop) !== destinationName).slice(0, 3);
    const upcoming = nextStops.map((stop, index) => `
        <div class="vehicle-stop">
            <div class="vehicle-stop-icon" style="--line-color: ${lineColor};"></div>
            <div class="vehicle-stop-name ${index === 0 ? "vehicle-next-stop" : ""}">
                ${escapeHtml(getStopName(stop))}
            </div>
        </div>
    `).join("");

    return `
        <div class="vehicle-timeline">
            ${upcoming}
            <div class="vehicle-destination-stop">
                <div class="vehicle-destination-dot" style="--line-color: ${lineColor};"></div>
                <div>
                    <div class="vehicle-destination-label">Ziel</div>
                    <div class="vehicle-destination-name">${escapeHtml(destinationName)}</div>
                </div>
            </div>
        </div>
    `;
}

export function createVehiclePopupContent(lineName, direction, stopsHtml, footerHtml = "") {
    return `
        <div class="vehicle-popup">
            <div class="vehicle-popup-line">${createLineBadge(lineName)}</div>
            ${direction ? `<div class="vehicle-popup-direction">${escapeHtml(direction)}</div>` : ""}
            ${stopsHtml ? `<div class="vehicle-popup-title">Nächste Haltestellen</div>${stopsHtml}` : ""}
            ${footerHtml}
        </div>
    `;
}
