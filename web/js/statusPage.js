const statusText = document.getElementById("overallStatusText");
const statusDot = document.getElementById("overallStatusDot");
const refreshButton = document.getElementById("refreshStatus");
const previewMode = new URLSearchParams(window.location.search).get("preview");
const maxLatencySamples = 12;
const previewLatencyHistory = [132, 164, 151, 208, 184, 171, 226, 193, 177, 184];
const liveRefreshInterval = 60000;
const previewRefreshInterval = 2000;
let isChecking = false;

const providers = [
    {
        id: "vbb",
        name: "VBB",
        timeout: 3000,
        urls: [
            "https://api.transitradar.de/locations?query=Berlin&results=1&stops=true&addresses=false&poi=false",
            "https://api.transitradar.de/radar?north=52.55&south=52.50&east=13.45&west=13.35&results=1&frames=1"
        ]
    },
    {
        id: "hvv",
        name: "HVV",
        timeout: 15000,
        urls: [
            "https://api-hamburg.transitradar.de/healthz"
        ]
    },
    {
        id: "rmv",
        name: "RMV",
        timeout: 15000,
        urls: [
            "https://api-frankfurt.transitradar.de/healthz"
        ]
    },
    {
        id: "gvh",
        name: "GVH",
        timeout: 15000,
        urls: [
            "https://api-gvh.transitradar.de/healthz"
        ]
    }
].map(provider => ({
    ...provider,
    card: document.querySelector(`[data-provider-card="${provider.id}"]`),
    status: document.querySelector(`[data-provider-status="${provider.id}"]`),
    latency: document.querySelector(`[data-provider-latency="${provider.id}"]`),
    message: document.querySelector(`[data-provider-message="${provider.id}"]`),
    graph: document.querySelector(`[data-provider-graph="${provider.id}"]`),
    latencyHistory: [],
    state: "checking"
}));

function setClassState(element, state) {
    if (!element) {
        return;
    }

    element.classList.remove("checking", "online", "issues", "offline");
    element.classList.add(state);
}

function formatTime(date) {
    return date.toLocaleTimeString("de-DE", {
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

function renderLatencyGraph(provider) {
    if (!provider.graph) {
        return;
    }

    const paddedSamples = [
        ...Array(Math.max(maxLatencySamples - provider.latencyHistory.length, 0)).fill(null),
        ...provider.latencyHistory
    ];

    provider.graph.innerHTML = paddedSamples
        .map(sample => {
            const state = getLatencyState(sample);
            const height = Number.isFinite(sample)
                ? Math.min(Math.max(sample / 55, 1.1), 5.25)
                : 0.55;

            return `<span class="${state}" style="height: ${height.toFixed(2)}rem"></span>`;
        })
        .join("");
}

async function fetchWithTimeout(url, timeout) {
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
        return { ok: false, latency: null };
    } finally {
        clearTimeout(timeoutId);
    }
}

function renderChecking() {
    setClassState(statusDot, "checking");
    statusText.textContent = "Wird geprüft";
    refreshButton.disabled = true;

    providers.forEach(provider => {
        setClassState(provider.card, "checking");
        setClassState(provider.status, "checking");
        provider.status.textContent = "Wird geprüft";
        provider.latency.textContent = "--";
        provider.message.textContent = `Die Verfügbarkeit der ${provider.name}-API wird aktuell geprüft.`;
        renderLatencyGraph(provider);
    });
}

function updateOverallStatus() {
    const allOnline = providers.every(provider => provider.state === "online");
    const allOffline = providers.every(provider => provider.state === "offline");
    const state = allOnline ? "online" : allOffline ? "offline" : "issues";

    setClassState(statusDot, state);
    statusText.textContent = state === "online"
        ? "Live"
        : state === "issues"
            ? "Störungen erkannt"
            : "Nicht verfügbar";
    refreshButton.disabled = false;
}

function renderProviderStatus(provider, state, averageLatency) {
    const checkedAt = formatTime(new Date());

    provider.state = state;
    setClassState(provider.card, state);
    setClassState(provider.status, state);
    provider.status.textContent = state === "online"
        ? "Live"
        : state === "issues"
            ? "Störungen"
            : "Nicht verfügbar";
    provider.latency.textContent = Number.isFinite(averageLatency)
        ? `${averageLatency} ms`
        : "Keine Antwort";
    provider.latencyHistory = [
        ...provider.latencyHistory,
        state !== "offline" ? averageLatency : null
    ].slice(-maxLatencySamples);
    renderLatencyGraph(provider);
    provider.message.textContent = state === "online"
        ? `Die Verfügbarkeitsprüfungen für ${provider.name} antworten normal. Zuletzt geprüft um ${checkedAt} Uhr.`
        : state === "issues"
            ? `Einige Verfügbarkeitsprüfungen für ${provider.name} sind fehlgeschlagen. Zuletzt geprüft um ${checkedAt} Uhr.`
            : `Die Verfügbarkeitsprüfungen für ${provider.name} konnten nicht erfolgreich abgeschlossen werden. Zuletzt geprüft um ${checkedAt} Uhr.`;
}

async function checkProvider(provider) {
    if (previewMode === "online") {
        if (!provider.latencyHistory.length) {
            provider.latencyHistory = [...previewLatencyHistory];
        }

        renderProviderStatus(provider, "online", provider.latencyHistory.at(-1));
        return;
    }

    const results = await Promise.all(
        provider.urls.map(url => fetchWithTimeout(url, provider.timeout))
    );
    const successfulCount = results.filter(result => result.ok).length;
    const state = successfulCount === results.length
        ? "online"
        : successfulCount > 0
            ? "issues"
            : "offline";
    const successfulLatencies = results
        .map(result => result.latency)
        .filter(Number.isFinite);
    const averageLatency = successfulLatencies.length
        ? Math.round(
            successfulLatencies.reduce((total, latency) => total + latency, 0)
            / successfulLatencies.length
        )
        : null;

    renderProviderStatus(provider, state, averageLatency);
}

async function checkAllProviders({ showChecking = false } = {}) {
    if (isChecking) {
        return;
    }

    isChecking = true;

    if (showChecking) {
        renderChecking();
    }

    try {
        await Promise.all(providers.map(checkProvider));
        updateOverallStatus();
    } finally {
        isChecking = false;
    }
}

refreshButton.addEventListener("click", () => {
    checkAllProviders({ showChecking: true });
});

function startRealtimeStatusWatcher() {
    const refreshInterval = previewMode === "online"
        ? previewRefreshInterval
        : liveRefreshInterval;

    async function tick(options = {}) {
        await checkAllProviders(options);
        setTimeout(tick, refreshInterval);
    }

    tick({ showChecking: true });
}

startRealtimeStatusWatcher();
