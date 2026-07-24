const trips = new Map();
const TTL_MS = 30 * 60 * 1000;

export function storeTrips(entries) {
    const expiresAt = Date.now() + TTL_MS;

    for (const entry of entries) {
        if (entry?.trip?.id) {
            trips.set(entry.trip.id, { value: entry, expiresAt });
        }
    }
}

export function getStoredTrip(id) {
    const entry = trips.get(id);

    if (!entry) {
        return null;
    }

    if (entry.expiresAt <= Date.now()) {
        trips.delete(id);
        return null;
    }

    return entry.value;
}
