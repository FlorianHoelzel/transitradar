import { API_STATUS_CONFIG } from "./config.js";

const statusText = document.getElementById("overallStatusText");
const statusDot = document.getElementById("overallStatusDot");
const refreshButton = document.getElementById("refreshStatus");

const vbbCard = document.querySelector('[data-provider-card="vbb"]');
const vbbStatus = document.querySelector('[data-provider-status="vbb"]');
const vbbLatency = document.querySelector('[data-provider-latency="vbb"]');
const vbbMessage = document.querySelector('[data-provider-message="vbb"]');
const vbbGraph = document.querySelector('[data-provider-graph="vbb"]');
const previewMode = new URLSearchParams(window.location.search).get("preview");
const maxLatencySamples = 12;
const previewLatencyHistory = [132, 164, 151, 208, 184, 171, 226, 193, 177, 184];
const liveRefreshInterval = 5000;
const previewRefreshInterval = 2000;
let vbbLatencyHistory = [];
let isChecking = false;

function setClassState(element, state) {
    if (!element) {
        return;
    }

    element.classList.remove("checking", "online", "offline");
    element.classList.add(state);
}

function formatTime(date) {
    return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getLatencyState(latency) {
    if (latency === null) {
        return "empty";
    }

    if (!Number.isFinite(latency)) {
        return "offline";
    }

    if (latency <= 350) {
        return "fast";
    }

    if (latency <= 800) {
        return "slow";
    }

    return "critical";
}

function addLatencySample(latency) {
    vbbLatencyHistory = [...vbbLatencyHistory, latency].slice(-maxLatencySamples);
}

function getPreviewLatency() {
    const previousLatency = vbbLatencyHistory.at(-1) ?? 184;
    const drift = Math.round((Math.random() - 0.46) * 72);

    return Math.min(Math.max(previousLatency + drift, 118), 340);
}

function renderLatencyGraph(samples) {
    if (!vbbGraph) {
        return;
    }

    const paddedSamples = [
        ...Array(Math.max(maxLatencySamples - samples.length, 0)).fill(null),
        ...samples
    ];

    vbbGraph.innerHTML = paddedSamples
        .map(sample => {
            const state = getLatencyState(sample);
            const height = Number.isFinite(sample)
                ? Math.min(Math.max(sample / 55, 1.1), 5.25)
                : 0.55;

            return `<span class="${state}" style="height: ${height.toFixed(2)}rem"></span>`;
        })
        .join("");
}

async function fetchWithTimeout(url, timeout = API_STATUS_CONFIG.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const startedAt = performance.now();

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            cache: "no-store"
        });

        return {
            ok: response.ok,
            latency: Math.round(performance.now() - startedAt)
        };
    } catch {
        return {
            ok: false,
            latency: null
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

function renderChecking() {
    setClassState(statusDot, "checking");
    setClassState(vbbCard, "checking");
    setClassState(vbbStatus, "checking");

    statusText.textContent = "Checking";
    vbbStatus.textContent = "Checking";
    vbbLatency.textContent = "--";
    vbbMessage.textContent = "Running a fresh availability check against the VBB transport API.";
    renderLatencyGraph(vbbLatencyHistory);
    refreshButton.disabled = true;
}

function renderVbbStatus(isOnline, averageLatency) {
    const state = isOnline ? "online" : "offline";
    const checkedAt = formatTime(new Date());

    setClassState(statusDot, state);
    setClassState(vbbCard, state);
    setClassState(vbbStatus, state);

    statusText.textContent = isOnline ? "Operational" : "Disrupted";

    vbbStatus.textContent = isOnline ? "Operational" : "Unavailable";
    vbbLatency.textContent = averageLatency ? `${averageLatency} ms` : "No response";
    addLatencySample(isOnline ? averageLatency : null);
    renderLatencyGraph(vbbLatencyHistory);
    vbbMessage.textContent = isOnline
        ? `VBB probes are responding normally. Last checked at ${checkedAt}.`
        : `VBB probes did not complete successfully. Last checked at ${checkedAt}.`;

    refreshButton.disabled = false;
}

async function checkVbbStatus({ showChecking = false } = {}) {
    if (isChecking) {
        return;
    }

    isChecking = true;

    if (previewMode === "online") {
        if (!vbbLatencyHistory.length) {
            vbbLatencyHistory = previewLatencyHistory;
        }

        renderVbbStatus(true, getPreviewLatency());
        vbbMessage.textContent = "Preview mode: live response samples are updating in real time.";
        refreshButton.disabled = false;
        isChecking = false;
        return;
    }

    if (showChecking) {
        renderChecking();
    }

    try {
        const results = await Promise.all(
            API_STATUS_CONFIG.primaryTestUrls.map(url => fetchWithTimeout(url))
        );

        const isOnline = results.every(result => result.ok);
        const successfulLatencies = results
            .map(result => result.latency)
            .filter(latency => Number.isFinite(latency));

        const averageLatency = successfulLatencies.length
            ? Math.round(
                successfulLatencies.reduce((total, latency) => total + latency, 0)
                / successfulLatencies.length
            )
            : null;

        renderVbbStatus(isOnline, averageLatency);
    } finally {
        isChecking = false;
    }
}

refreshButton.addEventListener("click", () => {
    checkVbbStatus({ showChecking: true });
});

function startRealtimeStatusWatcher() {
    const refreshInterval = previewMode === "online"
        ? previewRefreshInterval
        : liveRefreshInterval;

    async function tick(options = {}) {
        await checkVbbStatus(options);

        setTimeout(() => {
            tick();
        }, refreshInterval);
    }

    tick({ showChecking: true });
}

startRealtimeStatusWatcher();
