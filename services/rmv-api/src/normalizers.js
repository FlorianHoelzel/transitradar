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

export function filterStopsByBounds(stops, bounds) {
    return stops.filter(stop => {
        const { latitude, longitude } = stop.location;

        return latitude >= bounds.minLat
            && latitude <= bounds.maxLat
            && longitude >= bounds.minLng
            && longitude <= bounds.maxLng;
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

function stopDate(stop, realtimePrefix, plannedPrefix) {
    return zonedDate(
        stop?.[`${realtimePrefix}Date`] || stop?.[`${plannedPrefix}Date`],
        stop?.[`${realtimePrefix}Time`] || stop?.[`${plannedPrefix}Time`]
    );
}

function normalizeStopover(stop) {
    const plannedArrival = zonedDate(stop?.arrDate, stop?.arrTime);
    const plannedDeparture = zonedDate(stop?.depDate, stop?.depTime);
    const arrival = stopDate(stop, "rtArr", "arr") || plannedArrival;
    const departure = stopDate(stop, "rtDep", "dep") || plannedDeparture;

    return {
        stop: normalizeStop(stop),
        arrival: arrival?.toISOString() || null,
        plannedArrival: plannedArrival?.toISOString() || null,
        departure: departure?.toISOString() || null,
        plannedDeparture: plannedDeparture?.toISOString() || null,
        arrivalPlatform: platformText(stop?.rtArrPlatform || stop?.arrPlatform),
        departurePlatform: platformText(stop?.rtDepPlatform || stop?.depPlatform),
        cancelled: Boolean(stop?.cancelled)
    };
}

function coordinatesFromPolylineGroup(polylineGroup) {
    const descriptors = polylineGroup?.polylineDesc || [];
    const coordinates = [];

    for (const descriptor of descriptors) {
        const values = descriptor?.crd || [];

        for (let index = 0; index + 1 < values.length; index += 2) {
            const point = [Number(values[index]), Number(values[index + 1])];
            const previousPoint = coordinates.at(-1);

            if (
                Number.isFinite(point[0])
                && Number.isFinite(point[1])
                && (point[0] !== previousPoint?.[0] || point[1] !== previousPoint?.[1])
            ) {
                coordinates.push(point);
            }
        }
    }

    return coordinates;
}

export function normalizeJourneyDetail(data, context = {}) {
    const rawStops = data?.Stops?.Stop || [];

    if (rawStops.length === 0) {
        return null;
    }

    const product = Array.isArray(data?.Product) ? data.Product[0] : data?.Product || {};
    const directions = data?.Directions?.Direction || [];
    const directionEntry = Array.isArray(directions) ? directions.at(-1) : directions;
    const stopovers = rawStops.map(normalizeStopover);
    const polylineCoordinates = coordinatesFromPolylineGroup(data?.PolylineGroup);

    return {
        trip: {
            id: data?.ref || context.journeyId || "",
            direction: directionEntry?.value
                || context.direction
                || stopovers.at(-1)?.stop?.name
                || "",
            line: {
                type: "line",
                id: product?.matchId || product?.internalName || product?.name,
                name: product?.name || context.lineName || "",
                product: productFromClass(product?.cls)
            },
            stopovers,
            polyline: polylineCoordinates.length >= 2 ? {
                type: "Feature",
                properties: {},
                geometry: {
                    type: "LineString",
                    coordinates: polylineCoordinates
                }
            } : null
        }
    };
}

function normalizeJourneyLeg(leg) {
    const origin = leg?.Origin || leg?.origin || {};
    const destination = leg?.Destination || leg?.destination || {};
    const rawProduct = Array.isArray(leg?.Product) ? leg.Product[0] : leg?.Product || {};
    const walking = /WALK|FOOT/u.test(String(leg?.type || rawProduct?.catOut || "").toUpperCase());
    const plannedDeparture = zonedDate(origin.date, origin.time);
    const plannedArrival = zonedDate(destination.date, destination.time);
    const departure = zonedDate(
        origin.rtDate || origin.date,
        origin.rtTime || origin.time
    ) || plannedDeparture;
    const arrival = zonedDate(
        destination.rtDate || destination.date,
        destination.rtTime || destination.time
    ) || plannedArrival;

    return {
        tripId: leg?.JourneyDetailRef?.ref || leg?.journeyId || "",
        walking,
        origin: normalizeStop(origin),
        destination: normalizeStop(destination),
        departure: departure?.toISOString() || null,
        plannedDeparture: plannedDeparture?.toISOString() || null,
        arrival: arrival?.toISOString() || null,
        plannedArrival: plannedArrival?.toISOString() || null,
        departurePlatform: platformText(origin.rtPlatform || origin.platform),
        arrivalPlatform: platformText(destination.rtPlatform || destination.platform),
        direction: leg?.direction || destination?.name || "",
        cancelled: Boolean(leg?.cancelled),
        line: walking ? null : {
            type: "line",
            id: rawProduct?.matchId || rawProduct?.lineId || rawProduct?.name,
            name: rawProduct?.name || leg?.name || "",
            product: productFromClass(rawProduct?.cls)
        },
        polyline: (() => {
            const coordinates = coordinatesFromPolylineGroup(leg?.PolylineGroup);

            return coordinates.length >= 2 ? {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates }
            } : null;
        })()
    };
}

export function normalizeJourneys(data) {
    return (data?.Trip || []).map((trip, index) => {
        const rawLegs = trip?.LegList?.Leg || trip?.legs || [];
        const legs = rawLegs.map(normalizeJourneyLeg);
        const transitLegs = legs.filter(leg => !leg.walking);
        const departure = legs[0]?.departure;
        const arrival = legs.at(-1)?.arrival;
        const duration = departure && arrival
            ? Math.max(0, (new Date(arrival) - new Date(departure)) / 1000)
            : 0;

        return {
            id: trip?.ctxRecon || trip?.id || String(index),
            departure,
            plannedDeparture: legs[0]?.plannedDeparture,
            arrival,
            plannedArrival: legs.at(-1)?.plannedArrival,
            duration,
            transfers: Math.max(0, transitLegs.length - 1),
            legs
        };
    }).filter(journey => journey.legs.length > 0);
}
