import {
    API_BASE_URLS,
    FALLBACK_API_BASE_URLS,
    STATION_CONFIG,
    DEPARTURE_CONFIG,
    VEHICLE_CONFIG
} from "../config.js";
import { getApiStatus, setApiStatus } from "./apiStatus.js";
import { fetchJson } from "./httpClient.js";

const VBB_API_BASE = API_BASE_URLS.vbb;
const VBB_FALLBACK_API_BASES = FALLBACK_API_BASE_URLS.vbb;

function createUrl(baseUrl, pathAndQuery) {
    const resolvedBaseUrl = baseUrl.startsWith("//") && window.location.protocol === "file:"
        ? `https:${baseUrl}`
        : baseUrl;

    return `${resolvedBaseUrl.replace(/\/$/, "")}${pathAndQuery}`;
}

async function fetchJsonFromUrls(urls, errorMessage, timeout) {
    let lastError = null;

    for (const url of urls) {
        try {
            return await fetchJson(url, errorMessage, timeout);
        } catch (error) {
            lastError = error;
            console.warn(`Request failed, trying next source: ${url}`, error);
        }
    }

    throw lastError ?? new Error(errorMessage);
}

async function fetchJsonPrimaryThenFallback(
    primaryUrl,
    fallbackUrls,
    errorMessage,
    timeout
) {
    if (getApiStatus() === "fallback" || getApiStatus() === "offline") {
        return {
            data: await fetchJsonFromUrls(fallbackUrls, errorMessage, timeout),
            source: "fallback"
        };
    }

    try {
        const data = await fetchJson(primaryUrl, errorMessage, timeout);

        if (getApiStatus() === "fallback") {
            setApiStatus("online");
        }

        return {
            data,
            source: "primary"
        };
    } catch (primaryError) {
        console.warn(`Primary API failed, trying fallback: ${primaryUrl}`, primaryError);

        const data = await fetchJsonFromUrls(fallbackUrls, errorMessage, timeout);
        setApiStatus("fallback");

        return {
            data,
            source: "fallback"
        };
    }
}

async function fetchJsonWithFallback(primaryUrl, fallbackUrls, errorMessage, timeout) {
    const result = await fetchJsonPrimaryThenFallback(
        primaryUrl,
        fallbackUrls,
        errorMessage,
        timeout
    );

    return result.data;
}

function getCleanStopId(stopId) {
    const parts = String(stopId).split(":");

    if (parts.length >= 3) {
        return parts[2];
    }

    return stopId;
}

function getRadarResultLimit(zoom) {
    if (zoom >= VEHICLE_CONFIG.radarZoomLevels.high) {
        return VEHICLE_CONFIG.radarResultLimits.highZoom;
    }

    if (zoom >= VEHICLE_CONFIG.radarZoomLevels.medium) {
        return VEHICLE_CONFIG.radarResultLimits.mediumZoom;
    }

    return VEHICLE_CONFIG.radarResultLimits.default;
}

function removeDuplicateDepartures(departures) {
    const departuresByKey = new Map();

    departures.forEach(departure => {
        const key = departure.tripId
            ? `trip:${departure.tripId}`
            : [
                "departure",
                departure.line?.name,
                departure.direction,
                departure.when
            ].join(":");
        const existingDeparture = departuresByKey.get(key);

        if (
            !existingDeparture ||
            new Date(departure.when).getTime() > new Date(existingDeparture.when).getTime()
        ) {
            departuresByKey.set(key, departure);
        }
    });

    return [...departuresByKey.values()];
}

function isCurrentDeparture(departure) {
    const departureTime = new Date(departure.when || departure.plannedWhen).getTime();

    if (!Number.isFinite(departureTime)) {
        return false;
    }

    return departureTime >= Date.now() - DEPARTURE_CONFIG.staleGraceMs;
}

function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function createDepartureCollector(stopIds, results, duration) {
    const collectedDepartures = [];
    const failures = [];
    let completedCount = 0;

    const requests = stopIds.map(stopId => {
        return fetchDeparturesForStop(stopId, results, duration)
            .then(departures => {
                collectedDepartures.push(...departures);
            })
            .catch(error => {
                failures.push(error);
            })
            .finally(() => {
                completedCount += 1;
            });
    });

    return {
        collectedDepartures,
        failures,
        isComplete: () => completedCount === requests.length,
        waitForAll: () => Promise.allSettled(requests)
    };
}

function prepareDepartureResults(departures) {
    return removeDuplicateDepartures(departures)
        .filter(departure => departure.when)
        .filter(isCurrentDeparture)
        .sort((a, b) => new Date(a.when) - new Date(b.when));
}

function normalizeScheduledDeparture(departure) {
    const plannedWhen = departure.plannedWhen || departure.when;

    return {
        ...departure,
        when: plannedWhen,
        plannedWhen,
        delay: 0,
        dataSource: "fallback"
    };
}

function normalizeLiveDeparture(departure) {
    return {
        ...departure,
        dataSource: "live"
    };
}

async function fetchDeparturesForStop(stopId, results, duration) {
    const cleanStopId = getCleanStopId(stopId);
    const pathAndQuery =
        `/stops/${cleanStopId}/departures` +
        `?results=${results}` +
        `&duration=${duration}`;

    const primaryUrl = createUrl(VBB_API_BASE, pathAndQuery);
    const fallbackUrls = VBB_FALLBACK_API_BASES.map(baseUrl => {
        return createUrl(baseUrl, pathAndQuery);
    });

    const result = await fetchJsonPrimaryThenFallback(
        primaryUrl,
        fallbackUrls,
        "Failed to load departures.",
        DEPARTURE_CONFIG.requestTimeout
    );

    const data = result.data;
    const departures = Array.isArray(data)
        ? data
        : data.departures ?? [];

    if (result.source === "fallback") {
        return departures.map(normalizeScheduledDeparture);
    }

    return departures.map(normalizeLiveDeparture);
}

async function fetchDeparturesForStation(
    station,
    results = DEPARTURE_CONFIG.fallbackResults,
    duration = DEPARTURE_CONFIG.fallbackDuration
) {
    const uniqueStopIds = [
        ...new Set(
            station.stops
                .map(stop => stop.id)
                .filter(Boolean)
                .map(getCleanStopId)
        )
    ];

    const collector = createDepartureCollector(uniqueStopIds, results, duration);

    await Promise.race([
        collector.waitForAll(),
        wait(DEPARTURE_CONFIG.firstRenderTimeout)
    ]);

    if (collector.collectedDepartures.length > 0) {
        return prepareDepartureResults(collector.collectedDepartures);
    }

    if (!collector.isComplete()) {
        await collector.waitForAll();
    }

    if (collector.collectedDepartures.length === 0) {
        throw collector.failures[0] ?? new Error("Failed to load departures.");
    }

    return prepareDepartureResults(collector.collectedDepartures);
}

export async function loadStationsFromApi() {
    const pathAndQuery = `/stations?limit=${STATION_CONFIG.apiResultsLimit}`;

    return await fetchJsonWithFallback(
        createUrl(VBB_API_BASE, pathAndQuery),
        VBB_FALLBACK_API_BASES.map(baseUrl => createUrl(baseUrl, pathAndQuery)),
        "Failed to load stations."
    );
}

export async function getDepartures(station) {
    const departures = await fetchDeparturesForStation(
        station,
        DEPARTURE_CONFIG.requestResults,
        DEPARTURE_CONFIG.requestDuration
    );

    return departures.slice(0, DEPARTURE_CONFIG.displayLimit);
}

export async function getVehicleMovements(bounds, zoom) {
    const results = getRadarResultLimit(zoom);

    const pathAndQuery =
        `/radar` +
        `?north=${bounds.getNorth()}` +
        `&south=${bounds.getSouth()}` +
        `&east=${bounds.getEast()}` +
        `&west=${bounds.getWest()}` +
        `&results=${results}` +
        `&polylines=false` +
        `&frames=1`;

    const data = await fetchJson(
        createUrl(VBB_API_BASE, pathAndQuery),
        "Failed to load live vehicles.",
        VEHICLE_CONFIG.requestTimeout
    );

    return data.movements ?? [];
}

export async function getTripDetails(tripId, lineName) {
    const pathAndQuery =
        `/trips/${encodeURIComponent(tripId)}` +
        `?lineName=${encodeURIComponent(lineName)}` +
        `&polyline=true` +
        `&stopovers=true` +
        `&remarks=false`;

    return await fetchJsonWithFallback(
        createUrl(VBB_API_BASE, pathAndQuery),
        VBB_FALLBACK_API_BASES.map(baseUrl => createUrl(baseUrl, pathAndQuery)),
        "Failed to load trip route."
    );
}
