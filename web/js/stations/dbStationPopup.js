import { loadDbDepartures } from "../api/dbDepartures.js";
import {
    createDeparturesHtml,
    createPopupContent,
    getStationLinesHtml
} from "./stationPopup.js";
import { setupFade, setupStationLinesToggle } from "./popupPresentation.js";

const DISPLAY_LIMIT = 12;
const TIME_OPTIONS = { interactive: false, timeZone: "Europe/Berlin", showHours: true };
const POPUP_OPTIONS = { showFavorite: false };

export function bindDbStationPopup(marker, station) {
    let countdown;
    marker.bindPopup("", {
        className: "db-departure-popup",
        closeButton: false,
        autoPanPadding: [10, 10]
    });

    marker.on("popupopen", async ({ popup }) => {
        const template = document.createElement("template");
        template.innerHTML = createPopupContent(station, undefined, POPUP_OPTIONS).trim();
        const content = template.content.firstElementChild;
        const lines = content.querySelector(".station-lines");
        const departures = content.querySelector(".departures");
        lines.hidden = true;
        departures.setAttribute("aria-busy", "true");
        departures.setAttribute("aria-label", "Abfahrten");
        departures.tabIndex = 0;
        popup.setContent(content);

        try {
            const board = await loadDbDepartures(station);
            if (!content.isConnected) return;

            const visibleBoard = board.slice(0, DISPLAY_LIMIT);
            if (visibleBoard.length) {
                lines.innerHTML = getStationLinesHtml({ lines: visibleBoard.map(row => row.line.name) });
                lines.hidden = false;
                setupStationLinesToggle(content);
            }

            function renderDepartures() {
                const cutoff = Date.now() - 30_000;
                const scrollTop = departures.scrollTop;
                const upcoming = board.filter(row => row.timestamp >= cutoff).slice(0, DISPLAY_LIMIT);
                departures.innerHTML = upcoming.length
                    ? createDeparturesHtml(upcoming, TIME_OPTIONS)
                    : '<div class="empty-departures">Keine ICE- oder Regionalabfahrten gefunden.</div>';
                departures.scrollTop = scrollTop;
                setupFade(content);
            }

            renderDepartures();
            countdown = setInterval(renderDepartures, 15_000);
        } catch (error) {
            if (!content.isConnected) return;
            console.warn("DB-Abfahrten konnten nicht geladen werden:", error);
            departures.innerHTML = '<div class="empty-departures" role="status">Abfahrten konnten nicht geladen werden. Öffne den Bahnhof erneut.</div>';
        } finally {
            if (content.isConnected) {
                departures.removeAttribute("aria-busy");
                popup.update();
            }
        }
    });

    marker.on("popupclose", () => clearInterval(countdown));
}
