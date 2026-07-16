import { createLineBadge } from "../lines/badges.js";
import { isFavoriteStation } from "../favorites/favoriteService.js";
import { getDisplayStationName } from "./stationNames.js";
import {
    formatClockTime,
    getDepartureTimeDisplay
} from "../settings/departureTime.js";

const MAX_VISIBLE_LINES = 8;

const LINE_PRIORITY = [
    /^U\d+/,
    /^S\d+/,
    /^RE\d+/,
    /^RB\d+/,
    /^FEX$/,
    /^M\d+/,
    /^N\d+/,
    /^\d+/
];

function createSkeletonHtml() {
    return `
        <div class="popup-skeleton-card"></div>
        <div class="popup-skeleton-card"></div>
        <div class="popup-skeleton-card"></div>
    `;
}

function getLinePriority(lineName) {
    const index = LINE_PRIORITY.findIndex(pattern => pattern.test(lineName));

    return index === -1 ? 999 : index;
}

function sortStationLines(lines) {
    return [...new Set(lines)]
        .filter(Boolean)
        .sort((a, b) => {
            const priorityDiff = getLinePriority(a) - getLinePriority(b);

            if (priorityDiff !== 0) {
                return priorityDiff;
            }

            return a.localeCompare(b, "de-DE", { numeric: true });
        });
}

export function getStationLinesHtml(station) {
    const lines = sortStationLines(station.lines || []);

    if (lines.length === 0) {
        return `<span class="station-line-placeholder">Keine Liniendaten</span>`;
    }

    const hiddenCount = Math.max(0, lines.length - MAX_VISIBLE_LINES);

    const lineBadges = lines.map((line, index) => {
        const hiddenClass = index >= MAX_VISIBLE_LINES
            ? " station-line-hidden"
            : "";

        return `
            <span class="station-line-item${hiddenClass}">
                ${createLineBadge(line)}
            </span>
        `;
    }).join("");

    const toggleButton = hiddenCount > 0
        ? `
            <button
                class="station-lines-toggle"
                type="button"
                data-expanded="false"
                data-hidden-count="${hiddenCount}"
                title="Alle Linien anzeigen"
            >
                +${hiddenCount}
            </button>
        `
        : "";

    return lineBadges + toggleButton;
}

export function hasFallbackDepartures(departures = []) {
    return departures.some(departure => departure.dataSource === "fallback");
}

export function getFallbackNoticeHtml(showNotice = false) {
    if (!showNotice) {
        return "";
    }

    return `
        <div class="station-fallback-notice">
            Live-API derzeit nicht verfügbar. Es werden Fahrplandaten verwendet.
        </div>
    `;
}

function createTimeHtml(departure) {
    const plannedTime = formatClockTime(departure.plannedWhen);
    const realtime = formatClockTime(departure.when || departure.plannedWhen);
    const { showClock } = getDepartureTimeDisplay(
        departure.when || departure.plannedWhen
    );
    const delay = departure.delay ?? 0;

    if (delay <= 0 && !showClock) {
        return "";
    }

    if (delay <= 0) {
        return `
            <div class="popup-departure-time-block">
                <span class="popup-realtime">${realtime}</span>
            </div>
        `;
    }

    const delayMinutes = Math.round(delay / 60);
    const delayClass = delay >= 300 ? "delay-large" : "delay-small";

    return `
        <div class="popup-departure-time-block">
            ${showClock ? `
                <div class="popup-departure-times">
                    <span class="popup-planned-time">${plannedTime}</span>
                    <span class="popup-realtime">${realtime}</span>
                </div>
            ` : ""}

            <span class="popup-delay ${delayClass}">
                +${delayMinutes}
            </span>
        </div>
    `;
}

export function createPopupContent(station, content = createSkeletonHtml()) {
    const isFavorite = isFavoriteStation(station);
    const favoriteIcon = isFavorite ? "★" : "☆";
    const favoriteClass = isFavorite ? "active" : "";

    return `
        <div class="station-popup station-popup-v2">
            <div class="station-popup-header">
                <div class="station-popup-title-group">
                    <div class="station-title">${getDisplayStationName(station)}</div>
                    <div class="station-lines">
                        ${getStationLinesHtml(station)}
                    </div>
                </div>

                <button
                    class="station-favorite-button ${favoriteClass}"
                    type="button"
                    title="Favoritenstatus ändern"
                >
                    ${favoriteIcon}
                </button>
            </div>

            <div class="departures-wrapper station-departures-wrapper">
                <div class="departures station-departures">
                    ${content}
                </div>
            </div>
        </div>
    `;
}

export function createDeparturesHtml(departures) {
    if (departures.length === 0) {
        return "<div class='empty-departures'>Keine Abfahrten gefunden.</div>";
    }

    return departures.map(departure => {
        const lineName = departure.line?.name || "";
        const tripId = departure.tripId || "";
        const direction = departure.direction || "Richtung unbekannt";
        const timeDisplay = getDepartureTimeDisplay(
            departure.when || departure.plannedWhen
        );

        return `
            <div
                class="popup-departure-card clickable-departure"
                data-trip-id="${tripId}"
                data-line-name="${lineName}"
            >
                <div class="popup-departure-surface">
                    <div class="popup-departure-left">
                        ${createLineBadge(lineName)}
                    </div>

                    <div class="popup-departure-center">
                        <div class="popup-departure-direction">
                            ${direction}
                        </div>

                        ${timeDisplay.showRelative ? `
                            <div class="popup-departure-relative">
                                ${timeDisplay.relative}
                            </div>
                        ` : ""}
                    </div>

                    <div class="popup-departure-right">
                        ${createTimeHtml(departure)}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}
