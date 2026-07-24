import { config } from "./config.js";
import {
    parseTriasXml,
    serviceRequest,
    upstreamError
} from "./triasXml.js";

let requestQueue = Promise.resolve();
let lastRequestStartedAt = 0;
let quotaDate = "";
let requestsToday = 0;

function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function currentQuotaDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
}

function consumeQuota() {
    const today = currentQuotaDate();

    if (today !== quotaDate) {
        quotaDate = today;
        requestsToday = 0;
    }

    if (requestsToday >= config.dailyRequestLimit) {
        const error = new Error("The daily GVH upstream request limit has been reached.");
        error.statusCode = 429;
        throw error;
    }

    requestsToday += 1;
}

async function rateLimited(loader) {
    const previousRequest = requestQueue;
    let releaseRequest;

    requestQueue = new Promise(resolve => {
        releaseRequest = resolve;
    });

    await previousRequest;

    try {
        const delay = Math.max(
            lastRequestStartedAt + config.minimumRequestIntervalMs - Date.now(),
            0
        );

        if (delay > 0) {
            await wait(delay);
        }

        consumeQuota();
        lastRequestStartedAt = Date.now();
        return await loader();
    } finally {
        releaseRequest();
    }
}

export async function triasRequest(payload) {
    return await rateLimited(async () => {
        const response = await fetch(config.triasBaseUrl, {
            method: "POST",
            headers: {
                accept: "application/xml, text/xml",
                "content-type": "application/xml; charset=utf-8"
            },
            body: serviceRequest(payload, config.requestorRef),
            signal: AbortSignal.timeout(config.requestTimeoutMs)
        });

        if (!response.ok) {
            throw new Error(`GVH TRIAS request failed with status ${response.status}.`);
        }

        const document = parseTriasXml(await response.text());
        const message = upstreamError(document);

        if (message) {
            throw new Error(message);
        }

        return document;
    });
}
