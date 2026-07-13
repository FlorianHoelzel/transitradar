import { HTTP_CONFIG } from "../config.js";

export async function fetchJson(url, errorMessage, timeout = HTTP_CONFIG.timeout) {
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