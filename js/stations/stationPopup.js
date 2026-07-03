import { createLineBadge } from "../lines/badges.js";
import { isFavoriteStation } from "../favorites/favoriteService.js";
import { getDisplayStationName } from "./stationNames.js";

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

function getStationLinesHtml(station) {
    const lines = sortStationLines(station.lines || []);

    if (lines.length === 0) {
        return `<span class="station-line-placeholder">No line data</span>`;
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
                title="Show all lines"
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
            Live API currently unavailable. Using scheduled data
        </div>
    `;
}

function formatTime(dateString) {
    if (!dateString) {
        return "?";
    }

    return new Date(dateString).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getRelativeTimeText(dateString) {
    if (!dateString) {
        return "";
    }

    const minutes = Math.round(
        (new Date(dateString).getTime() - Date.now()) / 60000
    );

    if (minutes <= 0) {
        return "departing now";
    }

    if (minutes === 1) {
        return "in 1 min";
    }

    return `in ${minutes} min`;
}

function createTimeHtml(departure) {
    const plannedTime = formatTime(departure.plannedWhen);
    const realtime = formatTime(departure.when || departure.plannedWhen);
    const delay = departure.delay ?? 0;

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
            <div class="popup-departure-times">
                <span class="popup-planned-time">${plannedTime}</span>
                <span class="popup-realtime">${realtime}</span>
            </div>

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
                    title="Toggle favorite"
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
        return "<div class='empty-departures'>No departures found.</div>";
    }

    return departures.map(departure => {
        const lineName = departure.line?.name || "";
        const tripId = departure.tripId || "";
        const direction = departure.direction || "Unknown direction";
        const relativeTime = getRelativeTimeText(
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

                        <div class="popup-departure-relative">
                            ${relativeTime}
                        </div>
                    </div>

                    <div class="popup-departure-right">
                        ${createTimeHtml(departure)}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}
