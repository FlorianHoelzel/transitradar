import { createServer } from "node:http";

import { cached } from "./cache.js";
import { config } from "./config.js";
import { normalizeLocations } from "./normalizers.js";
import { rmvRequest } from "./rmvClient.js";

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

async function findLocations(url) {
    const query = (url.searchParams.get("query") || "Frankfurt").trim();
    const results = integerParameter(url, "results", 10, 100);
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

    if (url.pathname === "/locations") {
        sendJson(response, 200, await findLocations(url));
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
        sendJson(response, 502, { error: "The RMV data service is unavailable." });
    }
});

server.listen(config.port, "0.0.0.0", () => {
    console.log(`RMV adapter listening on port ${config.port}.`);
});
