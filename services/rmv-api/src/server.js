import { createServer } from "node:http";

import { cached } from "./cache.js";
import { config } from "./config.js";
import {
    filterStopsByBounds,
    normalizeDepartures,
    normalizeJourneys,
    normalizeJourneyDetail,
    normalizeLocations
} from "./normalizers.js";
import { rmvRequest } from "./rmvClient.js";
import { getDepartureStationId } from "./stationAliases.js";

const FRANKFURT_BOUNDS = {
    minLat: 49.98,
    maxLat: 50.25,
    minLng: 8.40,
    maxLng: 8.85
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

async function findLocations(url, nearby = false) {
    const results = integerParameter(url, "results", 10, 100);

    if (nearby) {
        const latitude = Number(url.searchParams.get("latitude"));
        const longitude = Number(url.searchParams.get("longitude"));

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            const error = new Error("Valid latitude and longitude are required.");
            error.statusCode = 400;
            throw error;
        }

        const distance = integerParameter(url, "distance", 3000, 5000);
        const cacheKey = `nearby:${latitude.toFixed(5)}:${longitude.toFixed(5)}:${distance}:${results}`;

        return await cached(cacheKey, 30000, async () => {
            const data = await rmvRequest("location.nearbystops", {
                originCoordLat: latitude,
                originCoordLong: longitude,
                maxNo: results,
                r: distance
            });

            return normalizeLocations(data);
        });
    }

    const query = (url.searchParams.get("query") || "Frankfurt").trim();
    const cacheKey = `locations:${query.toLocaleLowerCase("de-DE")}:${results}`;

    return await cached(cacheKey, 5 * 60 * 1000, async () => {
        const data = await rmvRequest("location.name", {
            input: query,
            maxNo: results,
            type: "S"
        });

        return normalizeLocations(data);
    });
}

async function getStations() {
    return await cached("stations:frankfurt", 6 * 60 * 60 * 1000, async () => {
        const data = await rmvRequest("location.name", {
            input: "Frankfurt",
            maxNo: 1000,
            type: "S"
        });

        return filterStopsByBounds(normalizeLocations(data), FRANKFURT_BOUNDS);
    });
}

async function getDepartures(url, stationId) {
    const results = integerParameter(url, "results", 20, 100);
    const duration = integerParameter(url, "duration", 60, 360);
    const departureStationId = getDepartureStationId(stationId);
    const cacheKey = `departures:${departureStationId}:${results}:${duration}`;

    return await cached(cacheKey, 30000, async () => {
        const data = await rmvRequest("departureBoard", {
            id: departureStationId,
            maxJourneys: results,
            duration
        });

        return { departures: normalizeDepartures(data) };
    });
}

function rmvDateTime(value) {
    const date = new Date(value);

    if (!Number.isFinite(date.getTime())) {
        const error = new Error("A valid journey time is required.");
        error.statusCode = 400;
        throw error;
    }

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}`
    };
}

async function getJourneys(url) {
    const originId = url.searchParams.get("from");
    const destId = url.searchParams.get("to");

    if (!originId || !destId) {
        const error = new Error("Origin and destination are required.");
        error.statusCode = 400;
        throw error;
    }

    const results = integerParameter(url, "results", 5, 8);
    const arrival = url.searchParams.get("arrival");
    const departure = url.searchParams.get("departure");
    const requestedTime = rmvDateTime(arrival || departure || new Date());
    const parameters = {
        originId,
        destId,
        date: requestedTime.date,
        time: requestedTime.time,
        searchForArrival: arrival ? 1 : 0,
        numF: arrival ? 0 : results,
        numB: arrival ? results : 0,
        passlist: 1,
        showPassingPoints: 1,
        rtMode: "FULL",
        poly: 1,
        polyEnc: "N"
    };
    const cacheKey = `journeys:${originId}:${destId}:${requestedTime.date}:${requestedTime.time}:${Boolean(arrival)}:${results}`;

    return await cached(cacheKey, 15000, async () => {
        const data = await rmvRequest("trip", parameters);
        return { journeys: normalizeJourneys(data).slice(0, results) };
    });
}

async function getTrip(url, journeyId) {
    return await cached(`trip:${journeyId}`, 30000, async () => {
        const data = await rmvRequest("journeyDetail", {
            id: journeyId,
            poly: 1,
            polyEnc: "N",
            showPassingPoints: 1
        });
        const result = normalizeJourneyDetail(data, {
            journeyId,
            lineName: url.searchParams.get("lineName") || ""
        });

        if (!result) {
            const error = new Error("Trip not found.");
            error.statusCode = 404;
            throw error;
        }

        return result;
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
        sendJson(response, 200, { status: "ok", provider: "rmv" });
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
        sendJson(
            response,
            200,
            await getTrip(url, decodeURIComponent(tripMatch[1]))
        );
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
            { error: error.statusCode ? error.message : "The RMV data service is unavailable." }
        );
    }
});

server.listen(config.port, "0.0.0.0", () => {
    console.log(`RMV adapter listening on port ${config.port}.`);
});
