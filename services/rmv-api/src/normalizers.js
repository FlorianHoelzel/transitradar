const PRODUCT_CLASS_MAP = [
    [1, "express"],
    [2, "express"],
    [4, "regional"],
    [8, "suburban"],
    [16, "subway"],
    [32, "tram"],
    [64, "bus"],
    [128, "ferry"]
];

function emptyProducts() {
    return {
        express: false,
        regional: false,
        suburban: false,
        subway: false,
        tram: false,
        bus: false,
        ferry: false
    };
}

export function normalizeProducts(productAtStop = [], productsBitmask = 0) {
    const products = emptyProducts();
    const productClasses = [
        Number(productsBitmask || 0),
        ...productAtStop.map(product => Number(product?.cls || 0))
    ];

    for (const productClass of productClasses) {
        for (const [mask, name] of PRODUCT_CLASS_MAP) {
            if ((productClass & mask) !== 0) {
                products[name] = true;
            }
        }
    }

    return products;
}

export function normalizeStop(stop) {
    const latitude = Number(stop?.lat);
    const longitude = Number(stop?.lon);
    const lines = [...new Set(
        (stop?.productAtStop || []).map(product => product?.name).filter(Boolean)
    )];

    return {
        type: "stop",
        id: stop?.extId || stop?.id,
        name: stop?.name || "",
        location: {
            type: "location",
            latitude,
            longitude
        },
        products: normalizeProducts(stop?.productAtStop, stop?.products),
        lines
    };
}

export function normalizeLocations(data) {
    return (data?.stopLocationOrCoordLocation || [])
        .map(entry => entry?.StopLocation)
        .filter(stop => stop?.extId || stop?.id)
        .map(normalizeStop)
        .filter(stop => {
            return Number.isFinite(stop.location.latitude)
                && Number.isFinite(stop.location.longitude);
        });
}

function zonedDate(date, time) {
    if (!date || !time) {
        return null;
    }

    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute, second = 0] = time.split(":").map(Number);
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date(utcGuess));
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const representedAsUtc = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second)
    );
    const offset = representedAsUtc - utcGuess;

    return new Date(utcGuess - offset);
}

function productFromClass(rawClass) {
    const productClass = Number(rawClass || 0);
    const match = PRODUCT_CLASS_MAP.find(([mask]) => (productClass & mask) !== 0);

    return match?.[1] || "bus";
}

function platformText(platform) {
    return platform?.text || platform || null;
}

export function normalizeDeparture(departure) {
    const product = departure?.ProductAtStop || departure?.Product?.[0] || {};
    const plannedDate = zonedDate(departure?.date, departure?.time);
    const realtimeDate = zonedDate(
        departure?.rtDate || departure?.date,
        departure?.rtTime || departure?.time
    );
    const plannedTimestamp = plannedDate?.getTime();
    const realtimeTimestamp = realtimeDate?.getTime();
    const delay = Number.isFinite(plannedTimestamp) && Number.isFinite(realtimeTimestamp)
        ? Math.round((realtimeTimestamp - plannedTimestamp) / 1000)
        : 0;

    return {
        tripId: departure?.JourneyDetailRef?.ref || departure?.altId || "",
        direction: departure?.direction || "",
        when: realtimeDate?.toISOString() || plannedDate?.toISOString() || null,
        plannedWhen: plannedDate?.toISOString() || null,
        delay,
        platform: platformText(departure?.rtPlatform || departure?.platform),
        plannedPlatform: platformText(departure?.platform),
        cancelled: Boolean(departure?.cancelled) || departure?.JourneyStatus === "C",
        line: {
            type: "line",
            id: product?.matchId || product?.lineId || product?.name || departure?.name,
            name: product?.name || departure?.name || "",
            product: productFromClass(product?.cls)
        }
    };
}

export function normalizeDepartures(data) {
    return (data?.Departure || [])
        .map(normalizeDeparture)
        .filter(departure => departure.when && departure.line.name);
}
