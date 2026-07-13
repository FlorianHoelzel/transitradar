import {
    getStoredFavorites,
    saveStoredFavorites
} from "./favoriteStore.js";

const FAVORITES_CHANGED_EVENT = "favoritesChanged";

function getStationId(station) {
    return station.id || station.name;
}

function normalizeStation(station) {
    return {
        id: getStationId(station),
        name: station.name,
        coordinates: station.coordinates,
        products: station.products ?? {}
    };
}

function emitFavoritesChanged() {
    window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT, {
        detail: getFavorites()
    }));
}

export function getFavorites() {
    return getStoredFavorites();
}

export function isFavoriteStation(station) {
    const stationId = getStationId(station);

    if (!stationId) {
        return false;
    }

    return getFavorites().some(favorite => favorite.id === stationId);
}

export function addFavorite(station) {
    const stationId = getStationId(station);

    if (!stationId || isFavoriteStation(station)) {
        return;
    }

    const favorites = [
        ...getFavorites(),
        normalizeStation(station)
    ];

    saveStoredFavorites(favorites);
    emitFavoritesChanged();
}

export function removeFavorite(station) {
    const stationId = getStationId(station);

    if (!stationId) {
        return;
    }

    const favorites = getFavorites().filter(favorite => {
        return favorite.id !== stationId;
    });

    saveStoredFavorites(favorites);
    emitFavoritesChanged();
}

export function toggleFavorite(station) {
    if (isFavoriteStation(station)) {
        removeFavorite(station);
        return false;
    }

    addFavorite(station);
    return true;
}

export function onFavoritesChanged(callback) {
    window.addEventListener(FAVORITES_CHANGED_EVENT, callback);
}

export function offFavoritesChanged(callback) {
    window.removeEventListener(FAVORITES_CHANGED_EVENT, callback);
}