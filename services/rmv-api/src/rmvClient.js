import { config } from "./config.js";

let requestQueue = Promise.resolve();
let lastRequestStartedAt = 0;

function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
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

        lastRequestStartedAt = Date.now();
        return await loader();
    } finally {
        releaseRequest();
    }
}

export async function rmvRequest(pathname, parameters = {}) {
    return await rateLimited(async () => {
        const url = new URL(`${config.rmvBaseUrl}/${pathname.replace(/^\//u, "")}`);

        url.searchParams.set("accessId", config.rmvAccessId);
        url.searchParams.set("format", "json");

        for (const [name, value] of Object.entries(parameters)) {
            if (value !== undefined && value !== null && value !== "") {
                url.searchParams.set(name, String(value));
            }
        }

        const response = await fetch(url, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(config.requestTimeoutMs)
        });

        if (!response.ok) {
            throw new Error(`RMV upstream request failed with status ${response.status}.`);
        }

        return await response.json();
    });
}
