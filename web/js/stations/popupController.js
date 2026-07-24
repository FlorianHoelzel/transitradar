import { showRouteForTrip } from "../map/routeLayer.js";
import { CITY_CONFIG, DEPARTURE_CONFIG } from "../config.js";
import {
    createDeparturesHtml,
    getStationLinesHtml,
    getFallbackNoticeHtml,
    hasFallbackDepartures
} from "./stationPopup.js";
import { loadDeparturesForStation } from "./departureService.js";
import { getStationServingLines } from "../api/transitApi.js";
import { waitForPopupElement } from "./popupLifecycle.js";
import {
    toggleFavorite,
    isFavoriteStation,
    onFavoritesChanged,
    offFavoritesChanged
} from "../favorites/favoriteService.js";

let popupRefreshInterval = null;
let favoriteChangeHandler = null;
const pendingPopupRefreshes = new WeakSet();
const servingLinesByStationId = new Map();

function updateFade(departures) {
    if (!departures) {
        return;
    }

    const canScroll = departures.scrollHeight > departures.clientHeight;
    const atBottom =
        departures.scrollTop + departures.clientHeight >= departures.scrollHeight - 2;

    departures.classList.toggle("has-fade", canScroll && !atBottom);
}

function setupFade(popupElement) {
    const departures = popupElement?.querySelector(".departures");

    if (!departures) {
        return;
    }

    updateFade(departures);

    departures.onscroll = () => {
        updateFade(departures);
    };
}

function setupStationLinesToggle(popupElement) {
    const linesContainer = popupElement?.querySelector(".station-lines");
    const toggleButton = popupElement?.querySelector(".station-lines-toggle");

    if (!linesContainer || !toggleButton) {
        return;
    }

    toggleButton.onclick = event => {
        event.preventDefault();
        event.stopPropagation();

        linesContainer.classList.add("expanded");

        toggleButton.remove();
    };
}

function setupDepartureRouteClicks(popupElement) {
    const departureRows = popupElement?.querySelectorAll(".clickable-departure");

    if (!departureRows) {
        return;
    }

    departureRows.forEach(row => {
        row.addEventListener("click", () => {
            const tripId = row.dataset.tripId;
            const lineName = row.dataset.lineName;

            if (!tripId || !lineName) {
                return;
            }

            showRouteForTrip(tripId, lineName, {
                showControl: true
            });
        });
    });
}

function updateFavoriteButtonState(favoriteButton, station) {
    const isFavorite = isFavoriteStation(station);

    favoriteButton.textContent = isFavorite ? "★" : "☆";
    favoriteButton.classList.toggle("active", isFavorite);
}

function removeFavoriteChangeHandler() {
    if (!favoriteChangeHandler) {
        return;
    }

    offFavoritesChanged(favoriteChangeHandler);
    favoriteChangeHandler = null;
}

function setupFavoriteButton(popupElement, station) {
    const favoriteButton = popupElement?.querySelector(".station-favorite-button");

    if (!favoriteButton) {
        return;
    }

    removeFavoriteChangeHandler();
    updateFavoriteButtonState(favoriteButton, station);

    favoriteButton.onclick = event => {
        event.preventDefault();
        event.stopPropagation();

        toggleFavorite(station);
        updateFavoriteButtonState(favoriteButton, station);
    };

    favoriteChangeHandler = () => {
        updateFavoriteButtonState(favoriteButton, station);
    };

    onFavoritesChanged(favoriteChangeHandler);
}

function setupPopupInteractions(popupElement, station) {
    setupFavoriteButton(popupElement, station);
    setupStationLinesToggle(popupElement);
    setupDepartureRouteClicks(popupElement);
    setupFade(popupElement);
}

function updateFallbackNotice(popupElement, departures) {
    const titleGroup = popupElement?.querySelector(".station-popup-title-group");

    if (!titleGroup) {
        return;
    }

    titleGroup
        .querySelector(".station-fallback-notice")
        ?.remove();

    titleGroup.insertAdjacentHTML(
        "beforeend",
        getFallbackNoticeHtml(hasFallbackDepartures(departures))
    );
}

const REPLACEMENT_SERVICE_PATTERN = /(?:^|[-\s])SEV(?:$|[-\s])/iu;

function getLineName(line) {
    if (typeof line === "string" || typeof line === "number") {
        return String(line);
    }

    return line?.name ? String(line.name) : "";
}

function updateDiscoveredStationLines(popupElement, station, lines) {
    const linesContainer = popupElement?.querySelector(".station-lines");

    if (!linesContainer) {
        return;
    }

    const discoveredLines = [
        ...new Set(
            lines
                .map(getLineName)
                .filter(line => {
                    return CITY_CONFIG.discoverStationLinesFromDepartures
                        ? Boolean(line)
                        : REPLACEMENT_SERVICE_PATTERN.test(line || "");
            })
        )
    ].sort((a, b) => a.localeCompare(b, "de-DE", { numeric: true }));
    const mergedLines = [
        ...new Set(
            [...(station.lines || []), ...discoveredLines]
                .map(getLineName)
                .filter(Boolean)
        )
    ];
    const replacementLinesKey = mergedLines
        .sort((a, b) => a.localeCompare(b, "de-DE", { numeric: true }))
        .join("\n");

    if (linesContainer.dataset.replacementLines === replacementLinesKey) {
        return;
    }

    station.lines = mergedLines;
    linesContainer.dataset.replacementLines = replacementLinesKey;
    linesContainer.classList.remove("expanded");
    linesContainer.innerHTML = getStationLinesHtml(station);
    setupStationLinesToggle(popupElement);
}

function updateReplacementServiceLines(popupElement, station, departures) {
    updateDiscoveredStationLines(
        popupElement,
        station,
        departures.map(departure => departure.line)
    );
}

async function enrichStationLines(popupElement, station) {
    if (!CITY_CONFIG.discoverStationLinesFromDepartures || !station?.id) {
        return;
    }

    const stationId = String(station.id);

    if (!servingLinesByStationId.has(stationId)) {
        servingLinesByStationId.set(
            stationId,
            getStationServingLines(station).catch(error => {
                console.warn("Linien der Haltestelle konnten nicht ergänzt werden:", error);
                return [];
            })
        );
    }

    const servingLines = await servingLinesByStationId.get(stationId);

    updateDiscoveredStationLines(popupElement, station, servingLines);
}

export function stopPopupRefresh() {
    if (popupRefreshInterval) {
        clearInterval(popupRefreshInterval);
        popupRefreshInterval = null;
    }
}

async function refreshPopupDepartures(marker, station) {
    if (pendingPopupRefreshes.has(marker)) {
        return;
    }

    const popupElement = marker.getPopup()?.getElement();
    const departuresContainer = popupElement?.querySelector(".departures");

    if (!departuresContainer) {
        return;
    }

    pendingPopupRefreshes.add(marker);
    const currentScrollTop = departuresContainer.scrollTop;

    try {
        const departures = await loadDeparturesForStation(station);
        const departuresHtml = createDeparturesHtml(departures);

        departuresContainer.innerHTML = departuresHtml;
        departuresContainer.scrollTop = currentScrollTop;

        updateReplacementServiceLines(popupElement, station, departures);
        updateFallbackNotice(popupElement, departures);
        setupDepartureRouteClicks(popupElement);
        setupFade(popupElement);
    } catch (error) {
        console.error("Abfahrten konnten nicht aktualisiert werden:", error);
        departuresContainer.innerHTML = "Abfahrten konnten nicht geladen werden.";
        setupFade(popupElement);
    } finally {
        pendingPopupRefreshes.delete(marker);
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

    const popupElement = await waitForPopupElement(marker);

    if (!popupElement || !marker.isPopupOpen()) {
        return;
    }

    setupPopupInteractions(popupElement, station);

    await refreshPopupDepartures(marker, station);

    if (marker.isPopupOpen()) {
        await enrichStationLines(popupElement, station);
    }

    if (marker.isPopupOpen()) {
        startPopupRefresh(marker, station);
    }
}

export function handleStationPopupClose() {
    stopPopupRefresh();
    removeFavoriteChangeHandler();
}
