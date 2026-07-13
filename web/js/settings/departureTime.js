import { getSettings } from "./settingsStore.js";

export function formatClockTime(dateString) {
    if (!dateString) {
        return "?";
    }

    return new Date(dateString).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

export function formatRelativeTime(dateString) {
    if (!dateString) {
        return "";
    }

    const minutes = Math.round(
        (new Date(dateString).getTime() - Date.now()) / 60000
    );

    if (minutes <= 0) {
        return "now";
    }

    if (minutes === 1) {
        return "in 1 min";
    }

    return `in ${minutes} min`;
}

export function getDepartureTimeDisplay(dateString) {
    const mode = getSettings().departureTimeDisplay;
    const clock = formatClockTime(dateString);
    const relative = formatRelativeTime(dateString);

    return {
        mode,
        clock,
        relative,
        showClock: mode === "clock" || mode === "both",
        showRelative: mode === "countdown" || mode === "both"
    };
}

export function formatCompactDepartureTime(dateString) {
    const display = getDepartureTimeDisplay(dateString);

    if (display.mode === "countdown") {
        return display.relative;
    }

    if (display.mode === "clock") {
        return display.clock;
    }

    return `${display.relative} · ${display.clock}`;
}
