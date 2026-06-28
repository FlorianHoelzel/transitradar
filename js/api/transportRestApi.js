import {
    API_BASE_URLS,
    RADAR_RESULT_LIMITS,
    RADAR_RESULT_ZOOM_LEVELS,
    STATION_RESULTS_LIMIT,
    DEPARTURE_REQUEST,
    DEPARTURE_FALLBACK_REQUEST
} from "../config.js";
import { fetchJson } from "./httpClient.js";

const BVG_API_BASE = API_BASE_URLS.bvg;
const VBB_API_BASE = API_BASE_URLS.vbb;

function getCleanStopId(stopId) {
    const parts = String(stopId).split(":");

    if (parts.length >= 3) {
        return parts[2];
    }

    return stopId;
}

function getRadarResultLimit(zoom) {
    if (zoom >= RADAR_RESULT_ZOOM_LEVELS.high) {
        return RADAR_RESULT_LIMITS.highZoom;
    }

    if (zoom >= RADAR_RESULT_ZOOM_LEVELS.medium) {
        return RADAR_RESULT_LIMITS.mediumZoom;
    }

    return RADAR_RESULT_LIMITS.default;
}

function removeDuplicateDepartures(departures) {
    return departures.filter((departure, index, array) => {
        const key = `${departure.line?.name}-${departure.direction}-${departure.when}`;

        return index === array.findIndex(item => {
            const itemKey = `${item.line?.name}-${item.direction}-${item.when}`;
            return itemKey === key;
        });
    });
}

async function fetchDeparturesForStop(stopId, results, duration) {
    const cleanStopId = getCleanStopId(stopId);

    const url =
        `${BVG_API_BASE}/stops/${cleanStopId}/departures` +
        `?results=${results}` +
        `&duration=${duration}`;

    try {
        const data = await fetchJson(
            url,
            "Failed to load departures."
        );

        if (Array.isArray(data)) {
            return data;
        }

        return data.departures ?? [];
    } catch (error) {
        console.warn(`Failed to load departures for stop ${cleanStopId}:`, error);
        return [];
    }
}

async function fetchDeparturesForStation(
    station,
    results = DEPARTURE_FALLBACK_REQUEST.results,
    duration = DEPARTURE_FALLBACK_REQUEST.duration
) {
    const allDepartures = [];

    const uniqueStopIds = [
        ...new Set(station.stops.map(stop => stop.id))
    ];

    for (const stopId of uniqueStopIds) {
        const departures = await fetchDeparturesForStop(stopId, results, duration);
        allDepartures.push(...departures);
    }

    const uniqueDepartures = removeDuplicateDepartures(allDepartures);

    return uniqueDepartures
        .filter(departure => departure.when)
        .sort((a, b) => new Date(a.when) - new Date(b.when));
}

export async function loadStationsFromApi() {
    return await fetchJson(
        `${BVG_API_BASE}/stops?results=${STATION_RESULTS_LIMIT}`,
        "Failed to load stations."
    );
}

export async function getDepartures(station) {
    const departures = await fetchDeparturesForStation(
        station,
        DEPARTURE_REQUEST.results,
        DEPARTURE_REQUEST.duration
    );

    return departures.slice(0, DEPARTURE_REQUEST.displayLimit);
}

export async function getVehicleMovements(bounds, zoom) {
    const results = getRadarResultLimit(zoom);

    const url =
        `${VBB_API_BASE}/radar` +
        `?north=${bounds.getNorth()}` +
        `&south=${bounds.getSouth()}` +
        `&east=${bounds.getEast()}` +
        `&west=${bounds.getWest()}` +
        `&results=${results}` +
        `&polylines=false` +
        `&frames=1`;

    const data = await fetchJson(
        url,
        "Failed to load live vehicles."
    );

    return data.movements ?? [];
}

export async function getTripDetails(tripId, lineName) {
    const url =
        `${BVG_API_BASE}/trips/${encodeURIComponent(tripId)}` +
        `?lineName=${encodeURIComponent(lineName)}` +
        `&polyline=true` +
        `&stopovers=true` +
        `&remarks=false`;

    return await fetchJson(
        url,
        "Failed to load trip route."
    );
}