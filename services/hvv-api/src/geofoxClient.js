import { createHmac, randomUUID } from "node:crypto";

import { config } from "./config.js";

let requestQueue = Promise.resolve();
let nextRequestAt = 0;

export function createSignature(body, password = config.geofoxPassword) {
    return createHmac("sha1", Buffer.from(password, "utf8"))
        .update(Buffer.from(body, "utf8"))
        .digest("base64");
}

async function waitForRateLimit() {
    const waitMs = Math.max(nextRequestAt - Date.now(), 0);

    if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    nextRequestAt = Date.now() + config.minimumRequestIntervalMs;
}

async function sendRequest(method, payload) {
    await waitForRateLimit();

    const body = JSON.stringify({
        language: "de",
        version: config.geofoxApiVersion,
        ...payload
    });
    const response = await fetch(
        `${config.geofoxBaseUrl.replace(/\/$/, "")}/${method}`,
        {
            method: "POST",
            headers: {
                "accept": "application/json",
                "content-type": "application/json;charset=UTF-8",
                "geofox-auth-type": "HmacSHA1",
                "geofox-auth-user": config.geofoxUser,
                "geofox-auth-signature": createSignature(body),
                "x-platform": "web",
                "x-traceid": randomUUID()
            },
            body,
            signal: AbortSignal.timeout(15000)
        }
    );

    if (!response.ok) {
        throw new Error(`Geofox ${method} returned HTTP ${response.status}.`);
    }

    const data = await response.json();

    if (data.returnCode !== "OK") {
        throw new Error(
            `Geofox ${method} failed: ${data.returnCode || "unknown error"}`
        );
    }

    return data;
}

export function geofoxRequest(method, payload) {
    const queuedRequest = requestQueue.then(
        () => sendRequest(method, payload),
        () => sendRequest(method, payload)
    );

    requestQueue = queuedRequest.catch(() => undefined);
    return queuedRequest;
}
