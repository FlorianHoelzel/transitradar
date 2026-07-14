import { createServer } from "node:http";

import { cached } from "./cache.js";
import { config } from "./config.js";
import {
    filterStopsByBounds,
    normalizeDepartures,
    normalizeLocations
} from "./normalizers.js";
import { rmvRequest } from "./rmvClient.js";

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
    const cacheKey = `departures:${stationId}:${results}:${duration}`;

    return await cached(cacheKey, 12000, async () => {
        const data = await rmvRequest("departureBoard", {
            id: stationId,
            maxJourneys: results,
            duration
        });

        return { departures: normalizeDepartures(data) };
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

    const departureMatch = url.pathname.match(/^\/stops\/(.+)\/departures$/u);

    if (departureMatch) {
        sendJson(
            response,
            200,
            await getDepartures(url, decodeURIComponent(departureMatch[1]))
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
