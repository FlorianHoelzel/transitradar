import { API_STATUS_CONFIG } from "../config.js";

let apiStatus = "checking";
let lastCheckedAt = null;

export function getApiStatus() {
    return apiStatus;
}

export function getLastCheckedAt() {
    return lastCheckedAt;
}

async function fetchWithTimeout(url, timeout = API_STATUS_CONFIG.timeout) {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal
        });

        return response.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function checkApiStatus(onStatusChange) {
    apiStatus = "checking";

    if (onStatusChange) {
        onStatusChange(apiStatus);
    }

    const results = await Promise.all(
        API_STATUS_CONFIG.testUrls.map(url => fetchWithTimeout(url))
    );

    const hasWorkingApi = results.some(result => result === true);

    apiStatus = hasWorkingApi ? "online" : "offline";

    lastCheckedAt = new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
    });

    if (onStatusChange) {
        onStatusChange(apiStatus);
    }
}

export function startApiStatusWatcher(onStatusChange) {
    checkApiStatus(onStatusChange);

    setInterval(() => {
        checkApiStatus(onStatusChange);
    }, API_STATUS_CONFIG.refreshInterval);
}