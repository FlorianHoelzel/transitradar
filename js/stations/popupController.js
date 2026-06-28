import { showRouteForTrip } from "../map/routeLayer.js";
import { DEPARTURE_CONFIG } from "../config.js";
import { createDeparturesHtml } from "./stationPopup.js";
import { loadDeparturesForStation } from "./departureService.js";

let popupRefreshInterval = null;

function updateFade(departures) {
    if (!departures) return;

    const canScroll = departures.scrollHeight > departures.clientHeight;
    const atBottom =
        departures.scrollTop + departures.clientHeight >= departures.scrollHeight - 2;

    departures.classList.toggle("has-fade", canScroll && !atBottom);
}

function setupFade(popupElement) {
    const departures = popupElement?.querySelector(".departures");

    if (!departures) return;

    updateFade(departures);

    departures.onscroll = () => {
        updateFade(departures);
    };
}

function setupDepartureRouteClicks(popupElement) {
    const departureRows = popupElement?.querySelectorAll(".clickable-departure");

    if (!departureRows) return;

    departureRows.forEach(row => {
        row.addEventListener("click", () => {
            const tripId = row.dataset.tripId;
            const lineName = row.dataset.lineName;

            if (!tripId || !lineName) return;

            showRouteForTrip(tripId, lineName, {
                showControl: true
            });
        });
    });
}

export function stopPopupRefresh() {
    if (popupRefreshInterval) {
        clearInterval(popupRefreshInterval);
        popupRefreshInterval = null;
    }
}

async function refreshPopupDepartures(marker, station) {
    const popupElement = marker.getPopup()?.getElement();
    const departuresContainer = popupElement?.querySelector(".departures");

    if (!departuresContainer) return;

    const currentScrollTop = departuresContainer.scrollTop;

    try {
        const departures = await loadDeparturesForStation(station);
        const departuresHtml = createDeparturesHtml(departures);

        departuresContainer.innerHTML = departuresHtml;
        departuresContainer.scrollTop = currentScrollTop;

        setupDepartureRouteClicks(popupElement);
        setupFade(popupElement);
    } catch (error) {
        console.error("Failed to update departures:", error);
        departuresContainer.innerHTML = "Departures could not be loaded.";
        setupFade(popupElement);
    }
}

function startPopupRefresh(marker, station) {
    stopPopupRefresh();

    popupRefreshInterval = setInterval(() => {
        refreshPopupDepartures(marker, station);
    }, DEPARTURE_CONFIG.popupRefreshInterval);
}

export async function handleStationPopupOpen(marker, station) {
    stopPopupRefresh();

    await refreshPopupDepartures(marker, station);

    startPopupRefresh(marker, station);
}

export function handleStationPopupClose() {
    stopPopupRefresh();
}