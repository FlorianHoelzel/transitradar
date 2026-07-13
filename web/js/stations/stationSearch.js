import { map } from "../map/map.js";
import { SEARCH_CONFIG } from "../config.js";
import { markers, updateVisibleMarkers } from "./stationMarkers.js";
import {
    getDisplayStationName,
    getSearchStationName
} from "./stationNames.js";
import {
    getStationImportanceScore,
    hasProduct,
    isTrainStation
} from "./stationUtils.js";

function getStationLines(station) {
    const stopLines = station.stops?.flatMap(stop => stop.lines || []) || [];

    return [
        ...(station.lines || []),
        ...stopLines
    ].filter(Boolean);
}

function getUniqueLineCount(station) {
    return new Set(getStationLines(station)).size;
}

function getTextMatchScore(station, searchText) {
    const rawName = station.name.toLowerCase();
    const displayName = getDisplayStationName(station).toLowerCase();
    const searchName = getSearchStationName(station).toLowerCase();
    const searchWords = searchName.split(/[\s,.-]+/u).filter(Boolean);

    if (searchName === searchText || displayName === searchText) {
        return 1000;
    }

    if (searchName.startsWith(searchText) || displayName.startsWith(searchText)) {
        return 850;
    }

    if (searchWords.some(word => word.startsWith(searchText))) {
        return 750;
    }

    if (searchName.includes(searchText) || displayName.includes(searchText)) {
        return 650;
    }

    if (rawName.includes(searchText)) {
        return 500;
    }

    return 0;
}

function getSearchImportanceScore(station) {
    let score = getStationImportanceScore(station) * 10;

    if (isTrainStation(station)) score += 40;
    if (hasProduct(station, "suburban")) score += 25;
    if (hasProduct(station, "subway")) score += 25;
    if (hasProduct(station, "regional")) score += 20;
    if (hasProduct(station, "express")) score += 10;

    score += Math.min(getUniqueLineCount(station), 12) * 4;

    return score;
}

function compareSearchResults(searchText) {
    return (stationA, stationB) => {
        const textScoreDiff =
            getTextMatchScore(stationB, searchText) -
            getTextMatchScore(stationA, searchText);

        if (textScoreDiff !== 0) {
            return textScoreDiff;
        }

        const importanceDiff =
            getSearchImportanceScore(stationB) -
            getSearchImportanceScore(stationA);

        if (importanceDiff !== 0) {
            return importanceDiff;
        }

        return getDisplayStationName(stationA)
            .localeCompare(getDisplayStationName(stationB), "de-DE", { numeric: true });
    };
}

export function setupSearch(stations) {
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");

    searchInput.addEventListener("input", () => {
        const searchText = searchInput.value.trim().toLowerCase();

        searchResults.innerHTML = "";

        if (searchText.length < SEARCH_CONFIG.minCharacters) {
            return;
        }

        const matchingStations = stations.filter(station => {
            const displayName = getDisplayStationName(station).toLowerCase();
            const searchName = getSearchStationName(station).toLowerCase();

            return (
                station.name.toLowerCase().includes(searchText) ||
                displayName.includes(searchText) ||
                searchName.includes(searchText)
            );
        });

        matchingStations
            .sort(compareSearchResults(searchText))
            .slice(0, SEARCH_CONFIG.maxResults)
            .forEach(station => {
                const resultItem = document.createElement("div");
                resultItem.textContent = getDisplayStationName(station);

                resultItem.addEventListener("click", () => {
                    map.flyTo(station.coordinates, SEARCH_CONFIG.flyToZoom, {
                        duration: SEARCH_CONFIG.flyToDuration
                    });

                    map.once("moveend", () => {
                        updateVisibleMarkers(stations);

                        setTimeout(() => {
                            if (markers[station.name]) {
                                markers[station.name].openPopup();
                            }
                        }, 100);
                    });

                    searchInput.value = getDisplayStationName(station);
                    searchResults.innerHTML = "";
                });

                searchResults.appendChild(resultItem);
            });
    });
}
