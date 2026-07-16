import { map } from "../map/map.js";
import { markers, updateVisibleMarkers } from "../stations/stationMarkers.js";
import { getStations } from "../stations/stationStore.js";
import { loadDeparturesForStation } from "../stations/departureService.js";
import { DEPARTURE_CONFIG } from "../config.js";
import {
    getFavorites,
    removeFavorite,
    onFavoritesChanged,
    offFavoritesChanged
} from "./favoriteService.js";
import {
    createFavoriteStationHtml,
    createFavoritesEmptyHtml,
    createFavoritesLoadingHtml
} from "./favoriteRenderer.js";

let favoritesRefreshInterval = null;
let isFavoritesRefreshActive = false;

function getStationKey(station) {
    return station.id || station.name;
}

function findFullStation(favorite) {
    return getStations().find(station => {
        return getStationKey(station) === getStationKey(favorite);
    }) || favorite;
}

function openStationOnMap(station) {
    if (!station?.coordinates) {
        return;
    }

    map.flyTo(station.coordinates, 16, {
        duration: 0.3
    });

    map.once("moveend", () => {
        updateVisibleMarkers(getStations());

        setTimeout(() => {
            const marker = markers[station.name];

            if (marker) {
                marker.openPopup();
            }
        }, 100);
    });
}

async function renderFavoriteStation(favorite) {
    const station = findFullStation(favorite);

    try {
        const departures = await loadDeparturesForStation(station);
        return createFavoriteStationHtml(station, departures);
    } catch (error) {
        console.error(`Abfahrten für ${station.name} konnten nicht geladen werden:`, error);
        return createFavoriteStationHtml(station, []);
    }
}

function setupFavoriteActions() {
    const favoriteCards = document.querySelectorAll(".favorite-card");

    favoriteCards.forEach(card => {
        const stationId = card.dataset.stationId;
        const favorite = getFavorites().find(item => item.id === stationId);

        if (!favorite) {
            return;
        }

        const openButton = card.querySelector(".favorite-open");
        const removeButton = card.querySelector(".favorite-remove");

        card.addEventListener("click", () => {
            openStationOnMap(findFullStation(favorite));
        });

        openButton?.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            openStationOnMap(findFullStation(favorite));
        });

        removeButton?.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            removeFavorite(favorite);
        });
    });
}

export async function renderFavorites() {
    const favoritesContainer = document.getElementById("favoritesList");

    if (!favoritesContainer) {
        return;
    }

    const favorites = getFavorites();

    if (favorites.length === 0) {
        favoritesContainer.innerHTML = createFavoritesEmptyHtml();
        return;
    }
    
    if (favoritesContainer.children.length === 0) {
    favoritesContainer.innerHTML = createFavoritesLoadingHtml();
    }

    const favoriteCards = await Promise.all(
        favorites.map(renderFavoriteStation)
    );



    favoritesContainer.innerHTML = favoriteCards.join("");

    setupFavoriteActions();
}

export function startFavoritesRefresh() {
    if (isFavoritesRefreshActive) {
        return;
    }

    isFavoritesRefreshActive = true;

    renderFavorites();

    onFavoritesChanged(renderFavorites);

    favoritesRefreshInterval = setInterval(() => {
        renderFavorites();
    }, DEPARTURE_CONFIG.popupRefreshInterval);
}

export function stopFavoritesRefresh() {
    if (!isFavoritesRefreshActive) {
        return;
    }

    isFavoritesRefreshActive = false;

    offFavoritesChanged(renderFavorites);

    if (favoritesRefreshInterval) {
        clearInterval(favoritesRefreshInterval);
        favoritesRefreshInterval = null;
    }
}
