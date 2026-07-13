import { createServer } from "node:http";

import { cached } from "./cache.js";
import { config } from "./config.js";
import { geofoxRequest } from "./geofoxClient.js";
import {
    normalizeDepartures,
    normalizeMovements,
    normalizeStop
} from "./normalizers.js";

function sendJson(response, status, value) {
    response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(value));
}

function applyCors(request, response) {
    const origin = request.headers.origin;

    if (origin === config.allowedOrigin) {
        response.setHeader("access-control-allow-origin", origin);
        response.setHeader("vary", "origin");
    }

    response.setHeader("access-control-allow-methods", "GET, OPTIONS");
    response.setHeader("access-control-allow-headers", "content-type");
}

function integerParameter(url, name, fallback, maximum = Number.MAX_SAFE_INTEGER) {
    const value = Number.parseInt(url.searchParams.get(name) || "", 10);
    return Number.isFinite(value) ? Math.min(Math.max(value, 1), maximum) : fallback;
}

function currentGtiTime() {
    const parts = new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

    return {
        date: `${values.day}.${values.month}.${values.year}`,
        time: `${values.hour}:${values.minute}`
    };
}

async function getStations() {
    return await cached("stations", 6 * 60 * 60 * 1000, async () => {
        const data = await geofoxRequest("listStations", {
            dataReleaseID: "",
            modificationTypes: [],
            coordinateType: "EPSG_4326",
            filterEquivalent: true
        });

        return (data.stations || [])
            .filter(station => station.exists !== false && station.coordinate)
            .map(normalizeStop);
    });
}

async function findLocations(url, nearby = false) {
    const results = integerParameter(url, "results", 10, nearby ? 10 : 100);
    const theName = nearby
        ? {
            type: "STATION",
            coordinate: {
                x: Number(url.searchParams.get("longitude")),
                y: Number(url.searchParams.get("latitude"))
            }
        }
        : {
            type: "STATION",
            name: url.searchParams.get("query") || "Hamburg"
        };
    const payload = {
        coordinateType: "EPSG_4326",
        maxList: results,
        maxDistance: nearby
            ? Math.min(integerParameter(url, "distance", 3000), 3000)
            : undefined,
        allowTypeSwitch: false,
        theName
    };
    const key = `locations:${JSON.stringify(payload)}`;
    const data = await cached(key, nearby ? 30000 : 5 * 60 * 1000, () => {
        return geofoxRequest("checkName", payload);
    });

    return (data.results || []).map(normalizeStop);
}

async function getDepartures(url, stationId) {
    const results = integerParameter(url, "results", 20, 100);
    const duration = integerParameter(url, "duration", 60, 360);
    const payload = {
        station: { id: stationId, type: "STATION" },
        time: currentGtiTime(),
        maxList: results,
        maxTimeOffset: duration,
        allStationsInChangingNode: true,
        useRealtime: true,
        coordinateType: "EPSG_4326"
    };
    const data = await cached(
        `departures:${stationId}:${results}:${duration}`,
        12000,
        () => geofoxRequest("departureList", payload)
    );

    return {
        departures: normalizeDepartures(data, { stationId })
    };
}

async function getRadar(url) {
    const north = Number(url.searchParams.get("north"));
    const south = Number(url.searchParams.get("south"));
    const east = Number(url.searchParams.get("east"));
    const west = Number(url.searchParams.get("west"));
    const results = integerParameter(url, "results", 300, 1000);
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        boundingBox: {
            lowerLeft: { x: west, y: south, type: "EPSG_4326" },
            upperRight: { x: east, y: north, type: "EPSG_4326" }
        },
        periodBegin: now - 120,
        periodEnd: now + 120,
        withoutCoords: false,
        coordinateType: "EPSG_4326",
        vehicleTypes: [
            "F_BAHN", "R_BAHN", "S_BAHN", "A_BAHN", "U_BAHN",
            "SCHIFF", "REGIONALBUS", "METROBUS", "NACHTBUS",
            "SCHNELLBUS", "XPRESSBUS", "AST"
        ],
        realtime: true
    };
    const cacheKey = `radar:${north.toFixed(3)}:${south.toFixed(3)}:${east.toFixed(3)}:${west.toFixed(3)}`;
    const data = await cached(cacheKey, 15000, () => {
        return geofoxRequest("getVehicleMap", payload);
    });

    const movements = normalizeMovements(data)
        .filter(movement => {
            return movement.location.latitude >= south
                && movement.location.latitude <= north
                && movement.location.longitude >= west
                && movement.location.longitude <= east;
        })
        .slice(0, results);

    return { movements };
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
        sendJson(response, 200, { status: "ok", provider: "hvv" });
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

    const departureMatch = url.pathname.match(/^\/stops\/(.+)\/departures$/);

    if (departureMatch) {
        sendJson(
            response,
            200,
            await getDepartures(url, decodeURIComponent(departureMatch[1]))
        );
        return;
    }

    if (url.pathname === "/radar") {
        sendJson(response, 200, await getRadar(url));
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
        sendJson(response, 502, { error: "The HVV data service is unavailable." });
    }
});

server.listen(config.port, "0.0.0.0", () => {
    console.log(`HVV adapter listening on port ${config.port}.`);
});
