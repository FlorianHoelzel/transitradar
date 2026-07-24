export const STATUS_HISTORY_KEY = "transitradar-status-history-v1";

const MAX_SAMPLES = 12;
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

function normalizeSamples(samples) {
    if (!Array.isArray(samples)) {
        return [];
    }

    return samples
        .filter(sample => {
            return sample === null
                || (Number.isFinite(sample) && sample >= 0 && sample <= 60000);
        })
        .slice(-MAX_SAMPLES);
}

export function loadStatusHistory(storage, now = Date.now()) {
    try {
        const cached = JSON.parse(storage.getItem(STATUS_HISTORY_KEY) || "null");
        const savedAt = Number(cached?.savedAt);

        if (
            !Number.isFinite(savedAt)
            || savedAt > now + 5 * 60 * 1000
            || now - savedAt > MAX_CACHE_AGE_MS
        ) {
            return {};
        }

        return Object.fromEntries(
            Object.entries(cached.providers || {})
                .map(([providerId, samples]) => [
                    providerId,
                    normalizeSamples(samples)
                ])
        );
    } catch {
        return {};
    }
}

export function saveStatusHistory(storage, providers, now = Date.now()) {
    try {
        const history = Object.fromEntries(
            providers.map(provider => [
                provider.id,
                normalizeSamples(provider.latencyHistory)
            ])
        );

        storage.setItem(
            STATUS_HISTORY_KEY,
            JSON.stringify({
                savedAt: now,
                providers: history
            })
        );
    } catch {
        // Status checks should continue when browser storage is unavailable.
    }
}
