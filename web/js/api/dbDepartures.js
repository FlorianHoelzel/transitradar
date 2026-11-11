import { fetchJson } from "./httpClient.js";

const STOP_TIMES_URL = "https://api.transitous.org/api/v6/stoptimes";
const REGIONAL_MODES = new Set(["REGIONAL_FAST_RAIL", "REGIONAL_RAIL"]);
const BOARD_MODES = ["HIGHSPEED_RAIL", "LONG_DISTANCE", ...REGIONAL_MODES];
const EXCLUDED_REGIONAL_LINE = /^(?:S(?:-?BAHN)?|RS)\s*\d|^S(?:-?BAHN)?$|^SEV/iu;
const ICE_LABEL = /^ICE(?:\s*(\d+[A-Z]?))?$/iu;
const CACHE_DURATION = 60_000;
const MAX_LOOKAHEAD = 24 * 60 * 60_000;
const boardCache = new WeakMap();

function stationKey(name) {
    const tokens = String(name ?? "").toLocaleLowerCase("de")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replaceAll("ß", "ss")
        .replace(/^(?:s\+u|s|u)\s+/u, "")
        .replace(/\bam main\b/u, "main")
        .replace(/\b(?:hbf|hauptbahnhof)\b/gu, "hbf")
        .replace(/[^a-z0-9]+/gu, " ")
        .trim()
        .split(" ")
        .filter(word => !["bf", "bhf", "bahnhof"].includes(word));
    return [...new Set(tokens)].sort().join(" ");
}

function getLineName(stopTime) {
    const shortName = stopTime.routeShortName?.trim();
    const displayName = stopTime.displayName?.trim();
    const trainNumber = stopTime.tripShortName?.trim();

    if (stopTime.mode === "HIGHSPEED_RAIL" || stopTime.mode === "LONG_DISTANCE") {
        let isIce = false;
        for (const label of [trainNumber, displayName, shortName]) {
            const match = label?.match(ICE_LABEL);
            if (match?.[1]) return `ICE ${match[1]}`;
            if (match) isIce = true;
        }
        return isIce ? "ICE" : null;
    }

    if (!REGIONAL_MODES.has(stopTime.mode)) return null;
    const name = shortName || displayName;
    return name && !EXCLUDED_REGIONAL_LINE.test(name) ? name : null;
}

export function normalizeDbDepartures(station, stopTimes, now = Date.now()) {
    const stationName = stationKey(station.name);
    const departures = new Map();

    for (const stopTime of stopTimes) {
        if (stationKey(stopTime.place?.name) !== stationName) continue;
        const lineName = getLineName(stopTime);
        if (!lineName) continue;

        const plannedWhen = stopTime.place.scheduledDeparture;
        const cancelled = stopTime.cancelled === true || stopTime.tripCancelled === true;
        const when = cancelled ? plannedWhen : stopTime.place.departure || plannedWhen;
        const timestamp = Date.parse(when);
        if (!Number.isFinite(timestamp) || timestamp < now - 30_000 || timestamp > now + MAX_LOOKAHEAD) continue;

        const direction = stopTime.headsign || stopTime.tripTo?.name || "";
        const trainNumber = stopTime.tripShortName?.match(/^0*(\d+)$/u)?.[1];
        const identity = /^ICE \d/u.test(lineName) ? "" : trainNumber || stationKey(direction);
        const key = JSON.stringify([lineName, Date.parse(plannedWhen || when), identity]);
        const realTime = stopTime.realTime === true || cancelled;
        const previous = departures.get(key);
        if (previous && (previous.realTime || !realTime) && (!cancelled || previous.cancelled)) continue;

        departures.set(key, {
            line: { name: lineName },
            direction,
            when,
            plannedWhen,
            delay: realTime && plannedWhen ? (timestamp - Date.parse(plannedWhen)) / 1000 : 0,
            cancelled,
            realTime,
            timestamp
        });
    }

    return [...departures.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function loadDbDepartures(station) {
    const cached = boardCache.get(station);
    if (cached && Date.now() < cached.expiresAt) return cached.request;

    const query = new URLSearchParams({
        center: `${station.lat},${station.lon}`,
        radius: "450",
        mode: BOARD_MODES.join(","),
        n: "40",
        language: "de",
        withAlerts: "false"
    });
    const request = fetchJson(`${STOP_TIMES_URL}?${query}`, "Transitous-Abfahrten konnten nicht geladen werden.")
        .then(data => normalizeDbDepartures(station, data.stopTimes))
        .catch(error => {
            boardCache.delete(station);
            throw error;
        });
    boardCache.set(station, { expiresAt: Date.now() + CACHE_DURATION, request });
    return request;
}
