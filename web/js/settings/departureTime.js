import { getSettings } from "./settingsStore.js";

export function formatClockTime(dateString, timeZone) {
    if (!dateString) {
        return "?";
    }

    return new Date(dateString).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone
    });
}

export function formatRelativeTime(dateString, showHours = false) {
    if (!dateString) {
        return "";
    }

    const minutes = Math.round(
        (new Date(dateString).getTime() - Date.now()) / 60000
    );

    if (minutes <= 0) {
        return "jetzt";
    }

    if (minutes === 1) {
        return "in 1 Min.";
    }

    if (showHours && minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainder = minutes % 60;
        return remainder ? `in ${hours} Std. ${remainder} Min.` : `in ${hours} Std.`;
    }

    return `in ${minutes} Min.`;
}

export function getDepartureTimeDisplay(dateString, { showHours = false } = {}) {
    const mode = getSettings().departureTimeDisplay;
    const clock = formatClockTime(dateString);
    const relative = formatRelativeTime(dateString, showHours);

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
