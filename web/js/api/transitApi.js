import {
    API_BASE_URL,
    CITY_BOUNDS,
    CITY_CONFIG,
    STATION_CONFIG,
    DEPARTURE_CONFIG,
    JOURNEY_CONFIG,
    VEHICLE_CONFIG
} from "../config.js";
import { fetchJson } from "./httpClient.js";

function createUrl(baseUrl, pathAndQuery) {
    const resolvedBaseUrl = baseUrl.startsWith("//") && window.location.protocol === "file:"
        ? `https:${baseUrl}`
        : baseUrl;

    return `${resolvedBaseUrl.replace(/\/$/, "")}${pathAndQuery}`;
}

function getCleanStopId(stopId) {
    if (CITY_CONFIG.preserveQualifiedStopIds) {
        return String(stopId);
    }

    const parts = String(stopId).split(":");

    if (parts.length >= 3) {
        return parts[2];
    }

    return stopId;
}

function getStopDepartureScore(stop) {
    const products = Object.values(stop.products || {})
        .filter(Boolean)
        .length;
    const lines = new Set(stop.lines || []).size;
    const isDetailedPlatform = /\/|\[|(?:Südseite|Fernbus|Straße)\b/iu.test(
        stop.name || ""
    );

    return products * 100 + lines - (isDetailedPlatform ? 50 : 0);
}

function getDepartureStopIds(station) {
    const uniqueStops = [
        ...new Map(
            (station.stops || [])
                .filter(stop => stop?.id)
                .map(stop => [getCleanStopId(stop.id), stop])
        ).entries()
    ].map(([id, stop]) => ({ ...stop, id }));

    if (uniqueStops.length === 0 && station.id) {
        return [getCleanStopId(station.id)];
    }

    if (DEPARTURE_CONFIG.stopStrategy === "best") {
        return uniqueStops
            .sort((a, b) => getStopDepartureScore(b) - getStopDepartureScore(a))
            .slice(0, 1)
            .map(stop => stop.id);
    }

    return uniqueStops.map(stop => stop.id);
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

function getBoundsQuery(bounds) {
    return {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
    };
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
    let resolveFirstResult;
    const firstResult = new Promise(resolve => {
        resolveFirstResult = resolve;
    });

    const requests = stopIds.map(stopId => {
        return fetchDeparturesForStop(stopId, results, duration)
            .then(departures => {
                collectedDepartures.push(...departures);

                if (departures.length > 0) {
                    resolveFirstResult();
                }
            })
            .catch(error => {
                failures.push(error);
            })
            .finally(() => {
                completedCount += 1;

                if (completedCount === stopIds.length) {
                    resolveFirstResult();
                }
            });
    });

    return {
        collectedDepartures,
        failures,
        isComplete: () => completedCount === requests.length,
        waitForFirstResult: () => firstResult,
        waitForAll: () => Promise.allSettled(requests)
    };
}

function createCityBoundsGrid() {
    const cells = [];
    const gridSize = VEHICLE_CONFIG.selectedLineGridSize;
    const latStep = (CITY_BOUNDS.maxLat - CITY_BOUNDS.minLat) / gridSize;
    const lngStep = (CITY_BOUNDS.maxLng - CITY_BOUNDS.minLng) / gridSize;

    for (let row = 0; row < gridSize; row += 1) {
        for (let column = 0; column < gridSize; column += 1) {
            cells.push({
                north: CITY_BOUNDS.minLat + latStep * (row + 1),
                south: CITY_BOUNDS.minLat + latStep * row,
                east: CITY_BOUNDS.minLng + lngStep * (column + 1),
                west: CITY_BOUNDS.minLng + lngStep * column
            });
        }
    }

    return cells;
}

function getMovementKey(movement) {
    return movement.tripId ||
        [
            movement.line?.name,
            movement.direction,
            movement.location?.latitude,
            movement.location?.longitude
        ].join(":");
}

function dedupeMovements(movements) {
    const movementsByKey = new Map();

    movements.forEach(movement => {
        const key = getMovementKey(movement);

        if (key) {
            movementsByKey.set(key, movement);
        }
    });

    return [...movementsByKey.values()];
}

async function fetchVehicleMovementsGrid(boundsGrid, zoom) {
    const movements = [];
    const concurrency = VEHICLE_CONFIG.selectedLineGridConcurrency;

    for (let index = 0; index < boundsGrid.length; index += concurrency) {
        const batch = boundsGrid.slice(index, index + concurrency);
        const results = await Promise.allSettled(
            batch.map(boundsQuery => {
                return fetchVehicleMovements(boundsQuery, zoom);
            })
        );
        const failures = results.filter(result => {
            return result.status === "rejected";
        });

        if (failures.length > 0) {
            throw new Error("Das vollständige stadtweite Fahrzeugraster konnte nicht geladen werden.");
        }

        movements.push(
            ...results
                .filter(result => result.status === "fulfilled")
                .flatMap(result => result.value)
        );
    }

    return dedupeMovements(movements);
}

function prepareDepartureResults(departures) {
    return removeDuplicateDepartures(departures)
        .filter(departure => departure.when)
        .filter(isCurrentDeparture)
        .sort((a, b) => new Date(a.when) - new Date(b.when));
}

function normalizeStationsResponse(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (data && typeof data === "object") {
        const wrappedStations = data.stations ?? data.stops ?? data.locations;

        if (Array.isArray(wrappedStations)) {
            return wrappedStations;
        }

        return Object.values(data);
    }

    return [];
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

    const primaryUrl = createUrl(API_BASE_URL, pathAndQuery);

    const data = await fetchJson(
        primaryUrl,
        "Abfahrten konnten nicht geladen werden.",
        DEPARTURE_CONFIG.requestTimeout
    );
    const departures = Array.isArray(data)
        ? data
        : data.departures ?? [];

    return departures.map(normalizeLiveDeparture);
}

async function fetchDeparturesForStation(
    station,
    results = DEPARTURE_CONFIG.fallbackResults,
    duration = DEPARTURE_CONFIG.fallbackDuration
) {
    const uniqueStopIds = getDepartureStopIds(station);

    if (uniqueStopIds.length === 0) {
        throw new Error("Die Haltestelle besitzt keinen Abfahrts-Halt.");
    }

    const collector = createDepartureCollector(uniqueStopIds, results, duration);

    await Promise.race([
        collector.waitForAll(),
        collector.waitForFirstResult(),
        wait(DEPARTURE_CONFIG.firstRenderTimeout)
    ]);

    if (collector.collectedDepartures.length > 0) {
        return prepareDepartureResults(collector.collectedDepartures);
    }

    if (!collector.isComplete()) {
        await collector.waitForAll();
    }

    if (collector.collectedDepartures.length === 0) {
        throw collector.failures[0] ?? new Error("Abfahrten konnten nicht geladen werden.");
    }

    return prepareDepartureResults(collector.collectedDepartures);
}

async function searchStops(query, results = STATION_CONFIG.apiResultsLimit) {
    const pathAndQuery =
        `/locations` +
        `?query=${encodeURIComponent(query)}` +
        `&results=${results}` +
        `&stops=true` +
        `&addresses=false` +
        `&poi=false` +
        `&linesOfStops=true`;

    const data = await fetchJson(
        createUrl(API_BASE_URL, pathAndQuery),
        "Haltestellen konnten nicht gesucht werden.",
        STATION_CONFIG.requestTimeout
    );

    return normalizeStationsResponse(data);
}

export async function searchStations(query, results = 10) {
    return await searchStops(query, results);
}

async function fetchNearbyStops(point) {
    const pathAndQuery =
        `/locations/nearby` +
        `?latitude=${point.latitude}` +
        `&longitude=${point.longitude}` +
        `&results=${STATION_CONFIG.apiResultsLimit}` +
        `&distance=${STATION_CONFIG.nearbyDistance}` +
        `&stops=true` +
        `&poi=false` +
        `&linesOfStops=true`;

    const data = await fetchJson(
        createUrl(API_BASE_URL, pathAndQuery),
        "Haltestellen in der Nähe konnten nicht geladen werden.",
        STATION_CONFIG.requestTimeout
    );

    return normalizeStationsResponse(data);
}

function createStationGridPoints() {
    const points = [];
    const gridSize = STATION_CONFIG.nearbyGridSize;

    for (let row = 0; row < gridSize; row += 1) {
        for (let column = 0; column < gridSize; column += 1) {
            points.push({
                latitude: CITY_BOUNDS.minLat +
                    (CITY_BOUNDS.maxLat - CITY_BOUNDS.minLat) *
                    (row / (gridSize - 1)),
                longitude: CITY_BOUNDS.minLng +
                    (CITY_BOUNDS.maxLng - CITY_BOUNDS.minLng) *
                    (column / (gridSize - 1))
            });
        }
    }

    return points;
}

function dedupeStations(stationGroups) {
    const stationsById = new Map();

    stationGroups
        .filter(result => result.status === "fulfilled")
        .flatMap(result => result.value)
        .forEach(station => {
            if (station?.id) {
                stationsById.set(station.id, station);
            }
        });

    return [...stationsById.values()];
}

async function loadStationsFromNearbyGrid() {
    const stationResults = await Promise.allSettled(
        createStationGridPoints().map(fetchNearbyStops)
    );

    return dedupeStations(stationResults);
}

async function loadStationsFromLocationSearch() {
    const stationResults = await Promise.allSettled(
        STATION_CONFIG.searchQueries.map(searchStops)
    );

    return dedupeStations(stationResults);
}

export async function loadStationsFromApi() {
    const pathAndQuery = `/stations?limit=${STATION_CONFIG.apiResultsLimit}`;

    let data;

    try {
        data = await fetchJson(
            createUrl(API_BASE_URL, pathAndQuery),
            "Haltestellen konnten nicht geladen werden.",
            STATION_CONFIG.requestTimeout
        );
    } catch (error) {
        console.warn("Der Haltestellen-Endpunkt ist fehlgeschlagen. Das Umgebungsraster wird versucht.", error);
    }

    const stations = normalizeStationsResponse(data);

    if (stations.length > 0) {
        return stations;
    }

    console.warn("Der Haltestellen-Endpunkt lieferte keine Halte. Das Umgebungsraster wird versucht.");

    try {
        const nearbyStations = await loadStationsFromNearbyGrid();

        if (nearbyStations.length > 0) {
            return nearbyStations;
        }

        console.warn("Das Umgebungsraster lieferte keine Halte. Die Haltestellensuche wird versucht.");
    } catch (error) {
        console.warn("Das Umgebungsraster ist fehlgeschlagen. Die Haltestellensuche wird versucht.", error);
    }

    const searchStations = await loadStationsFromLocationSearch();

    return searchStations;
}

export async function getDepartures(station) {
    const departures = await fetchDeparturesForStation(
        station,
        DEPARTURE_CONFIG.requestResults,
        DEPARTURE_CONFIG.requestDuration
    );

    return departures.slice(0, DEPARTURE_CONFIG.displayLimit);
}

export async function getStationServingLines(station) {
    if (!station?.id) {
        return [];
    }

    const departures = await fetchDeparturesForStop(
        station.id,
        500,
        180
    );
    const linesByName = new Map();

    departures.forEach(departure => {
        const name = departure.line?.name;

        if (name && !linesByName.has(name)) {
            linesByName.set(name, departure.line);
        }
    });

    return [...linesByName.values()];
}

export async function getJourneys({ from, to, departure, arrival }) {
    const getJourneyStopScore = stop => {
        const products = stop?.products || {};
        const weights = {
            express: 800,
            regional: 600,
            suburban: 500,
            subway: 450,
            tram: 250,
            ferry: 200,
            bus: 100
        };

        return Object.entries(weights).reduce((score, [product, weight]) => {
            return score + (products[product] === true ? weight : 0);
        }, 0) + Math.min(new Set(stop?.lines || []).size, 99);
    };

    const getCandidates = station => {
        if (typeof station === "string" || typeof station === "number") {
            return [getCleanStopId(station)];
        }

        return [...new Map(
            [station, ...(station?.stops || [])]
                .filter(stop => stop?.id)
                .sort((a, b) => getJourneyStopScore(b) - getJourneyStopScore(a))
                .map(stop => [getCleanStopId(stop.id), getCleanStopId(stop.id)])
        ).values()].slice(0, 4);
    };

    const originIds = getCandidates(from);
    const destinationIds = getCandidates(to);
    const candidatePairs = originIds
        .flatMap((originId, originIndex) => {
            return destinationIds.map((destinationId, destinationIndex) => ({
                originId,
                destinationId,
                priority: originIndex + destinationIndex
            }));
        })
        .filter(pair => String(pair.originId) !== String(pair.destinationId))
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 6);

    const requestPair = async ({ originId, destinationId }) => {
        const parameters = new URLSearchParams({
            from: originId,
            to: destinationId,
            results: String(JOURNEY_CONFIG.results),
            stopovers: "true",
            polylines: "true",
            remarks: "true"
        });

        if (arrival) {
            parameters.set("arrival", arrival);
        } else if (departure) {
            parameters.set("departure", departure);
        }

        const data = await fetchJson(
            createUrl(API_BASE_URL, `/journeys?${parameters}`),
            "Verbindungen konnten nicht geladen werden.",
            JOURNEY_CONFIG.requestTimeout
        );

        return Array.isArray(data) ? data : data.journeys ?? [];
    };

    if (candidatePairs.length === 0) {
        return [];
    }

    let firstError = null;

    try {
        const journeys = await requestPair(candidatePairs[0]);

        if (journeys.length > 0 || candidatePairs.length === 1) {
            return journeys;
        }
    } catch (error) {
        firstError = error;
    }

    const fallbackResults = await Promise.allSettled(
        candidatePairs.slice(1).map(requestPair)
    );
    const successfulFallback = fallbackResults.find(result => {
        return result.status === "fulfilled" && result.value.length > 0;
    });

    if (successfulFallback) {
        return successfulFallback.value;
    }

    if (fallbackResults.some(result => result.status === "fulfilled")) {
        return [];
    }

    throw firstError || fallbackResults[0]?.reason;
}

async function fetchVehicleMovements(boundsQuery, zoom) {
    const results = getRadarResultLimit(zoom);

    const pathAndQuery =
        `/radar` +
        `?north=${boundsQuery.north}` +
        `&south=${boundsQuery.south}` +
        `&east=${boundsQuery.east}` +
        `&west=${boundsQuery.west}` +
        `&results=${results}` +
        `&polylines=false` +
        `&frames=1`;

    const data = await fetchJson(
        createUrl(API_BASE_URL, pathAndQuery),
        "Live-Fahrzeuge konnten nicht geladen werden.",
        VEHICLE_CONFIG.requestTimeout
    );

    return data.movements ?? [];
}

export async function getVehicleMovements(bounds, zoom) {
    return await fetchVehicleMovements(getBoundsQuery(bounds), zoom);
}

export async function getCityVehicleMovementsGrid(zoom) {
    if (CITY_CONFIG.vehicleGridStrategy === "single-request") {
        return await fetchVehicleMovements({
            north: CITY_BOUNDS.maxLat,
            south: CITY_BOUNDS.minLat,
            east: CITY_BOUNDS.maxLng,
            west: CITY_BOUNDS.minLng
        }, zoom);
    }

    return await fetchVehicleMovementsGrid(createCityBoundsGrid(), zoom);
}

export async function getTripDetails(tripId, lineName) {
    const pathAndQuery =
        `/trips/${encodeURIComponent(tripId)}` +
        `?lineName=${encodeURIComponent(lineName)}` +
        `&polyline=true` +
        `&stopovers=true` +
        `&remarks=false`;

    return await fetchJson(
        createUrl(API_BASE_URL, pathAndQuery),
        "Die Fahrtroute konnte nicht geladen werden."
    );
}
