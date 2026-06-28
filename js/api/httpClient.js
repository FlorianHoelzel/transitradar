import { HTTP_TIMEOUT } from "../config.js";

export async function fetchJson(url, errorMessage, timeout = HTTP_TIMEOUT) {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(errorMessage);
        }

        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}