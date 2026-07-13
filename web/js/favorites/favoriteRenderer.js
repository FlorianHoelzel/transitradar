import { createLineBadge } from "../lines/badges.js";
import { formatCompactDepartureTime } from "../settings/departureTime.js";

function getStationKey(station) {
    return station.id || station.name;
}

function getDelayText(departure) {
    if (!departure.delay || departure.delay <= 0) {
        return "";
    }

    return `+${Math.round(departure.delay / 60)}`;
}

function createFavoriteDepartureHtml(departure) {
    const lineName = departure.line?.name || "";
    const direction = departure.direction || "Unknown direction";
    const time = formatCompactDepartureTime(departure.when || departure.plannedWhen);
    const delayText = getDelayText(departure);

    return `
        <div class="favorite-departure">
            <div class="favorite-departure-main">
                <div class="favorite-departure-line">
                    ${createLineBadge(lineName)}
                    <span class="favorite-departure-direction">${direction}</span>
                </div>

                <div class="favorite-departure-time-group">
                    <span class="favorite-departure-time">${time}</span>
                    ${delayText ? `<span class="favorite-departure-delay">${delayText}</span>` : ""}
                </div>
            </div>
        </div>
    `;
}

export function createFavoriteStationHtml(station, departures = []) {
    const stationKey = getStationKey(station);

    const departuresHtml = departures.length > 0
        ? departures.slice(0, 5).map(createFavoriteDepartureHtml).join("")
        : `<div class="favorite-empty">No departures found.</div>`;

    return `
        <article class="favorite-card" data-station-id="${stationKey}">
            <div class="favorite-card-header">
                <button class="favorite-open" type="button" title="Open station">
                    <span class="favorite-star">⭐</span>
                    <span class="favorite-station-name">${station.name}</span>
                </button>

                <button class="favorite-remove" type="button" title="Remove favorite">
                    ×
                </button>
            </div>

            <div class="favorite-departures">
                ${departuresHtml}
            </div>
        </article>
    `;
}

export function createFavoritesEmptyHtml() {
    return `
        <div class="favorites-empty">
            No favorite stations yet.
        </div>
    `;
}

export function createFavoritesLoadingHtml() {
    return `
        <div class="favorites-loading">
            Loading favorites...
        </div>
    `;
}
