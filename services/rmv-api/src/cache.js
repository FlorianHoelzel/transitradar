const entries = new Map();
const pendingRequests = new Map();

export async function cached(key, ttlMs, loader) {
    const existing = entries.get(key);

    if (existing?.expiresAt > Date.now()) {
        return existing.value;
    }

    if (pendingRequests.has(key)) {
        return await pendingRequests.get(key);
    }

    const request = loader()
        .then(value => {
            entries.set(key, { value, expiresAt: Date.now() + ttlMs });
            return value;
        })
        .finally(() => pendingRequests.delete(key));

    pendingRequests.set(key, request);
    return await request;
}
