import { createServer } from "node:http";

import { cached } from "./cache.js";
import { config } from "./config.js";
import {
    normalizeJourneys,
    normalizeLocations,
    normalizeStopEvents
} from "./normalizers.js";
import {
    locationInformationRequest,
    stopEventRequest,
    tripRequest
} from "./triasXml.js";
import { triasRequest } from "./triasClient.js";
import { getStoredTrip, storeTrips } from "./tripStore.js";

const HANNOVER_BOUNDS = {
    minLat: 52.20,
    maxLat: 52.60,
    minLng: 9.45,
    maxLng: 10.05
};
const HANNOVER_CENTER = {
    latitude: 52.3759,
    longitude: 9.732
};

function sendJson(response, status, value) {
    response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(value));
}

function applyCors(request, response) {
    const origin = request.headers.origin;

    if (config.allowedOrigins.has(origin)) {
        response.setHeader("access-control-allow-origin", origin);
        response.setHeader("vary", "origin");
    }

    response.setHeader("access-control-allow-methods", "GET, OPTIONS");
    response.setHeader("access-control-allow-headers", "content-type");
}

function integerParameter(url, name, fallback, maximum) {
    const value = Number.parseInt(url.searchParams.get(name) || "", 10);
    return Number.isFinite(value) ? Math.min(Math.max(value, 1), maximum) : fallback;
}

function validCoordinate(url, name) {
    const value = Number(url.searchParams.get(name));

    if (!Number.isFinite(value)) {
        const error = new Error(`A valid ${name} is required.`);
        error.statusCode = 400;
        throw error;
    }

    return value;
}

function filterHannover(stops) {
    return stops.filter(stop => {
        const { latitude, longitude } = stop.location;

        return latitude >= HANNOVER_BOUNDS.minLat
            && latitude <= HANNOVER_BOUNDS.maxLat
            && longitude >= HANNOVER_BOUNDS.minLng
            && longitude <= HANNOVER_BOUNDS.maxLng;
    });
}

async function findLocations(url, nearby = false) {
    const results = integerParameter(url, "results", 10, 100);

    if (nearby) {
        const latitude = validCoordinate(url, "latitude");
        const longitude = validCoordinate(url, "longitude");
        const cacheKey = `nearby:${latitude.toFixed(5)}:${longitude.toFixed(5)}:${results}`;

        return await cached(cacheKey, 30000, async () => {
            const document = await triasRequest(locationInformationRequest({
                latitude,
                longitude,
                results
            }));
            return normalizeLocations(document);
        });
    }

    const query = (url.searchParams.get("query") || "Hannover").trim();
    const cacheKey = `locations:${query.toLocaleLowerCase("de-DE")}:${results}`;

    return await cached(cacheKey, 5 * 60 * 1000, async () => {
        const document = await triasRequest(locationInformationRequest({ query, results }));
        return normalizeLocations(document);
    });
}

async function getStations() {
    return await cached("stations:hannover", 6 * 60 * 60 * 1000, async () => {
        const document = await triasRequest(locationInformationRequest({
            ...HANNOVER_CENTER,
            results: 100
        }));
        return filterHannover(normalizeLocations(document));
    });
}

async function getDepartures(url, stationId) {
    const results = integerParameter(url, "results", 20, 100);
    const cacheKey = `departures:${stationId}:${results}`;

    return await cached(cacheKey, 30000, async () => {
        const document = await triasRequest(stopEventRequest({
            stopPointRef: stationId,
            departureTime: new Date().toISOString(),
            results
        }));
        const normalized = normalizeStopEvents(document);

        storeTrips(normalized.trips);
        return { departures: normalized.departures };
    });
}

function journeyTime(value) {
    const date = new Date(value || Date.now());

    if (!Number.isFinite(date.getTime())) {
        const error = new Error("A valid journey time is required.");
        error.statusCode = 400;
        throw error;
    }

    return date.toISOString();
}

async function getJourneys(url) {
    const originRef = url.searchParams.get("from");
    const destinationRef = url.searchParams.get("to");

    if (!originRef || !destinationRef) {
        const error = new Error("Origin and destination are required.");
        error.statusCode = 400;
        throw error;
    }

    const results = integerParameter(url, "results", 5, 8);
    const arrival = url.searchParams.get("arrival");
    const departure = url.searchParams.get("departure");
    const requestedTime = journeyTime(arrival || departure);
    const cacheKey = [
        "journeys",
        originRef,
        destinationRef,
        requestedTime,
        Boolean(arrival),
        results
    ].join(":");

    return await cached(cacheKey, 15000, async () => {
        const document = await triasRequest(tripRequest({
            originRef,
            destinationRef,
            departureTime: arrival ? null : requestedTime,
            arrivalTime: arrival ? requestedTime : null,
            results
        }));
        const normalized = normalizeJourneys(document);

        storeTrips(normalized.trips);
        return { journeys: normalized.journeys.slice(0, results) };
    });
}

async function routeRequest(request, response) {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
    }

    if (request.method !== "GET") {
        sendJson(response, 405, { error: "Method not allowed." });
        return;
    }

    if (url.pathname === "/healthz") {
        sendJson(response, 200, { status: "ok", provider: "gvh-trias" });
        return;
    }

    if (url.pathname === "/stations") {
        sendJson(response, 200, await getStations());
        return;
    }

    if (url.pathname === "/locations") {
        sendJson(response, 200, await findLocations(url));
        return;
    }

    if (url.pathname === "/locations/nearby") {
        sendJson(response, 200, await findLocations(url, true));
        return;
    }

    if (url.pathname === "/journeys") {
        sendJson(response, 200, await getJourneys(url));
        return;
    }

    if (url.pathname === "/radar") {
        sendJson(response, 200, { movements: [] });
        return;
    }

    const departureMatch = url.pathname.match(/^\/stops\/(.+)\/departures$/u);

    if (departureMatch) {
        sendJson(
            response,
            200,
            await getDepartures(url, decodeURIComponent(departureMatch[1]))
        );
        return;
    }

    const tripMatch = url.pathname.match(/^\/trips\/(.+)$/u);

    if (tripMatch) {
        const id = decodeURIComponent(tripMatch[1]);
        const trip = getStoredTrip(id);

        if (!trip) {
            sendJson(response, 404, {
                error: "Trip details expired. Refresh departures or journeys and try again."
            });
            return;
        }

        sendJson(response, 200, trip);
        return;
    }

    sendJson(response, 404, { error: "Not found." });
}

const server = createServer(async (request, response) => {
    applyCors(request, response);

    try {
        await routeRequest(request, response);
    } catch (error) {
        console.error(error.message);
        sendJson(
            response,
            error.statusCode || 502,
            {
                error: error.statusCode
                    ? error.message
                    : "The GVH data service is unavailable."
            }
        );
    }
});

server.listen(config.port, "0.0.0.0", () => {
    console.log(`GVH TRIAS adapter listening on port ${config.port}.`);
});
