import { getDbUpcomingStops, loadDbTrainStopovers } from "../api/dbTrainTrips.js?v=db-ui-1";
import { formatClockTime } from "../settings/departureTime.js";
import { escapeHtml } from "../ui/escapeHtml.js";
import { createVehiclePopupContent, createVehicleStopsHtml } from "./vehiclePopupContent.js";
import { setupVehiclePopupLifecycle } from "./vehiclePopupLifecycle.js";
import { cleanStopName, getLineColor } from "./vehicleUtils.js";

export function bindDbTrainPopup(marker, trainName) {
    let lookup;

    function render() {
        const { path, stopped } = marker.trainPosition;
        const stopovers = lookup?.stopovers || [];
        const upcoming = getDbUpcomingStops(stopovers, path);
        const destination = cleanStopName(stopovers.at(-1)?.name);
        const direction = destination ? `Richtung ${destination}` : "";
        const timeline = createVehicleStopsHtml(upcoming, getLineColor(trainName), { showDestinationOnly: true });
        const stopLabel = stopped ? "Aktueller Halt" : "Nächster Halt";
        const arrival = stopped ? "" : ` · ${formatClockTime(path.arrival, "Europe/Berlin")}`;
        const nextStop = cleanStopName(path.nextStop) || "Unbekannt";
        const source = path.realTime ? "mit Echtzeitdaten" : "nach Fahrplan";
        const loadingMessage = lookup?.stopovers === undefined
            ? "Streckenverlauf wird geladen …"
            : "Streckenverlauf nicht verfügbar.";

        const footer = `
            <div class="db-train-details">
                ${timeline ? `<div>${stopLabel}${arrival}</div>` : `
                    <div class="vehicle-popup-title">${stopLabel}${arrival}</div>
                    <div class="vehicle-popup-direction">${escapeHtml(nextStop)}</div>
                    <div role="status">${loadingMessage}</div>
                `}
                <div>Position geschätzt · ${source}</div>
            </div>
        `;
        return createVehiclePopupContent(trainName, direction, timeline, footer);
    }

    function updatePopup(reposition = false) {
        const popup = marker.getPopup();
        const autoPan = popup.options.autoPan;
        try {
            if (reposition) popup.options.autoPan = true;
            popup.update();
        } finally {
            popup.options.autoPan = autoPan;
        }
    }

    async function refresh() {
        const { tripId } = marker.trainPosition.path;
        if (lookup?.tripId === tripId) {
            updatePopup();
            return;
        }

        const current = { tripId };
        lookup = current;
        updatePopup();
        try {
            current.stopovers = await loadDbTrainStopovers(tripId);
        } catch {
            current.stopovers = [];
        }
        if (lookup === current && marker.isPopupOpen()) updatePopup(true);
    }

    marker.bindPopup(render, {
        className: "db-train-leaflet-popup",
        closeButton: false,
        autoPanPadding: [16, 16]
    });
    setupVehiclePopupLifecycle(marker);
    marker.on("popupopen", refresh);
    marker.on("popupclose", () => { lookup = undefined; });
    return refresh;
}
