const STORAGE_KEY = "transitRadarFavorites";

export function getStoredFavorites() {
    const storedFavorites = localStorage.getItem(STORAGE_KEY);

    if (!storedFavorites) {
        return [];
    }

    try {
        return JSON.parse(storedFavorites);
    } catch (error) {
        console.error("Failed to parse favorites:", error);
        return [];
    }
}

export function saveStoredFavorites(favorites) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}