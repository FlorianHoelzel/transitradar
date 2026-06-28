import { showRouteForTrip } from "../routeLayer.js";
import { getDepartures } from "../api/transportRestApi.js";
import { createPopupContent, createDeparturesHtml } from "./stationPopup.js";
import { activeFilters } from "../ui/filters.js";
import { map } from "../map.js";

let popupRefreshInterval = null;

const subwayIcon = L.divIcon({
    className: "station-marker subway-marker",
    html: "●",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
});

const suburbanIcon = L.divIcon({
    className: "station-marker suburban-marker",
    html: "●",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
});

const busIcon = L.divIcon({
    className: "station-marker bus-marker",
    html: "●",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6]
});

export const markers = {};

function getStationIcon(station) {
    const name = station.name.toLowerCase();

    if (name.startsWith("s+u ") || name.startsWith("s ")) {
        return suburbanIcon;
    }

    if (name.startsWith("u ")) {
        return subwayIcon;
    }

    return busIcon;
}

function shouldShowStation(station) {
    const zoom = map.getZoom();
    const name = station.name.toLowerCase();

    const isTrainStation =
        name.startsWith("s+u ") ||
        name.startsWith("s ") ||
        name.startsWith("u ");

    if (zoom < 14) {
        return isTrainStation;
    }

    return true;
}

function hasProduct(station, productName) {
    if (station.products?.[productName] === true) {
        return true;
    }

    return station.stops?.some(stop => {
        return stop.products?.[productName] === true;
    }) === true;
}

function matchesActiveStationFilter(station) {
    const name = station.name.toLowerCase();

    const isSuburban =
        name.startsWith("s ") ||
        name.startsWith("s+u ") ||
        hasProduct(station, "suburban");

    const isSubway =
        name.startsWith("u ") ||
        name.startsWith("s+u ") ||
        hasProduct(station, "subway");

    const isSurface =
        !name.startsWith("s ") &&
        !name.startsWith("u ") &&
        !name.startsWith("s+u ");

    if (isSuburban && activeFilters.stations.suburban) return true;
    if (isSubway && activeFilters.stations.subway) return true;
    if (isSurface && activeFilters.stations.surface) return true;

    return false;
}

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
        const departures = await getDepartures(station);
        const departuresHtml = createDeparturesHtml(departures);

        departuresContainer.innerHTML = departuresHtml;
        departuresContainer.scrollTop = currentScrollTop;

        setupDepartureRouteClicks(popupElement);
        setupFade(popupElement);
    } catch (error) {
        console.error("Fehler beim Aktualisieren der Abfahrten:", error);
        departuresContainer.innerHTML = "Abfahrten konnten nicht geladen werden.";
        setupFade(popupElement);
    }
}

function startPopupRefresh(marker, station) {
    stopPopupRefresh();

    popupRefreshInterval = setInterval(() => {
        refreshPopupDepartures(marker, station);
    }, 15000);
}

export function updateVisibleMarkers(stations) {
    const bounds = map.getBounds();

    Object.values(markers).forEach(marker => {
        map.removeLayer(marker);
    });

    Object.keys(markers).forEach(key => {
        delete markers[key];
    });

    const visibleStations = stations.filter(station => {
        return (
            bounds.contains(station.coordinates) &&
            shouldShowStation(station) &&
            matchesActiveStationFilter(station)
        );
    });

    visibleStations.slice(0, 200).forEach(station => {
        const marker = L.marker(station.coordinates, {
            icon: getStationIcon(station),
            zIndexOffset: 2000
        }).addTo(map);

        markers[station.name] = marker;

        marker.bindPopup(createPopupContent(station), {
            closeButton: false
        });

        marker.on("popupopen", async () => {
            stopPopupRefresh();

            await refreshPopupDepartures(marker, station);

            startPopupRefresh(marker, station);
        });

        marker.on("popupclose", () => {
            stopPopupRefresh();
        });
    });
}