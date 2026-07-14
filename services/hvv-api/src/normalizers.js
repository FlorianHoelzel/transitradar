const VEHICLE_TYPE_PRODUCTS = {
    U_BAHN: "subway",
    S_BAHN: "suburban",
    A_BAHN: "suburban",
    R_BAHN: "regional",
    F_BAHN: "express",
    SCHIFF: "ferry",
    REGIONALBUS: "bus",
    METROBUS: "bus",
    NACHTBUS: "bus",
    SCHNELLBUS: "bus",
    XPRESSBUS: "bus",
    AST: "bus"
};

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

export function normalizeProducts(types = []) {
    const products = emptyProducts();

    for (const rawType of types) {
        const type = String(rawType).toUpperCase();
        const product = VEHICLE_TYPE_PRODUCTS[type]
            || (type === "U" ? "subway" : null)
            || (type === "S" ? "suburban" : null)
            || (type === "BUS" ? "bus" : null)
            || (type === "SHIP" ? "ferry" : null);

        if (product) {
            products[product] = true;
        }
    }

    return products;
}

export function normalizeStop(stop, lines = []) {
    const name = stop.combinedName || stop.name;
    const types = stop.vehicleTypes || stop.serviceTypes || [];

    return {
        type: "stop",
        id: stop.id,
        name,
        location: {
            type: "location",
            latitude: stop.coordinate?.y,
            longitude: stop.coordinate?.x
        },
        products: normalizeProducts(types),
        lines: [...new Set(lines)].filter(Boolean)
    };
}

export function createStationLinesById(lines = [], regularLines = []) {
    const stationLines = new Map();

    for (const line of lines) {
        if (line?.exists === false || !line?.name) {
            continue;
        }

        for (const subline of line.sublines || []) {
            for (const station of subline.stationSequence || []) {
                if (!station?.id) {
                    continue;
                }

                if (!stationLines.has(station.id)) {
                    stationLines.set(station.id, new Set());
                }

                stationLines.get(station.id).add(line.name);
            }
        }
    }

    for (const line of regularLines) {
        for (const stationId of line.stationIds || []) {
            if (!stationLines.has(stationId)) {
                stationLines.set(stationId, new Set());
            }

            stationLines.get(stationId).add(line.name);
        }
    }

    return new Map(
        [...stationLines].map(([stationId, names]) => {
            return [stationId, [...names]];
        })
    );
}

export function productFromVehicleType(vehicleType) {
    const type = String(vehicleType || "").toUpperCase().replaceAll("-", "_");

    if (type.includes("U_BAHN") || type === "U") {
        return "subway";
    }

    if (type.includes("S_BAHN") || type === "S") {
        return "suburban";
    }

    return VEHICLE_TYPE_PRODUCTS[type] || "bus";
}

function zonedDate(year, month, day, hour, minute) {
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date(utcGuess));
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const representedAsUtc = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute)
    );
    const offset = representedAsUtc - utcGuess;

    return new Date(utcGuess - offset);
}

function parseGtiTime(time) {
    if (!time?.date || !time?.time) {
        return new Date();
    }

    const [day, month, year] = time.date.split(".").map(Number);
    const [hour, minute] = time.time.split(":").map(Number);
    return zonedDate(year, month, day, hour, minute);
}

export function normalizeDepartures(data, context) {
    const referenceTime = parseGtiTime(data.time);

    return (data.departures || []).map(departure => {
        const plannedWhen = new Date(
            referenceTime.getTime() + Number(departure.timeOffset || 0) * 60000
        );
        const delay = Number(departure.delay || 0);
        const when = new Date(plannedWhen.getTime() + delay * 1000);
        const tripContext = {
            serviceId: departure.serviceId,
            stationId: context.stationId,
            lineId: departure.line?.dlid || departure.line?.id,
            lineKey: departure.line?.id,
            direction: departure.line?.direction,
            time: when.toISOString()
        };

        return {
            tripId: Buffer.from(JSON.stringify(tripContext)).toString("base64url"),
            direction: departure.line?.direction || "",
            when: when.toISOString(),
            plannedWhen: plannedWhen.toISOString(),
            delay,
            platform: departure.realtimePlatform || departure.platform || null,
            plannedPlatform: departure.platform || null,
            cancelled: Boolean(departure.cancelled),
            line: {
                type: "line",
                id: departure.line?.id,
                name: departure.line?.name || "",
                product: productFromVehicleType(
                    departure.line?.type?.vehicleType || departure.line?.type?.shortInfo
                )
            }
        };
    });
}

export function encodeTripContext(context) {
    return Buffer.from(JSON.stringify(context)).toString("base64url");
}

export function decodeTripContext(token) {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
}

function withDelay(value, delaySeconds = 0) {
    if (!value) {
        return null;
    }

    const timestamp = new Date(value).getTime();

    if (!Number.isFinite(timestamp)) {
        return null;
    }

    return new Date(timestamp + Number(delaySeconds || 0) * 1000).toISOString();
}

function stopover(stop, times = {}) {
    return {
        stop: normalizeStop(stop),
        arrival: withDelay(times.arrival, times.arrivalDelay),
        plannedArrival: withDelay(times.arrival),
        departure: withDelay(times.departure, times.departureDelay),
        plannedDeparture: withDelay(times.departure),
        arrivalPlatform: times.arrivalPlatform || null,
        departurePlatform: times.departurePlatform || null,
        cancelled: Boolean(times.cancelled)
    };
}

export function normalizeCourse(data, context) {
    const elements = data.courseElements || [];

    if (elements.length === 0) {
        return null;
    }

    const first = elements[0];
    const stopovers = [
        stopover(first.fromStation, {
            departure: first.depTime,
            departureDelay: first.depDelay,
            departurePlatform: first.fromRealtimePlatform || first.fromPlatform,
            cancelled: first.fromCancelled
        }),
        ...elements.map(element => stopover(element.toStation, {
            arrival: element.arrTime,
            arrivalDelay: element.arrDelay,
            arrivalPlatform: element.toRealtimePlatform || element.toPlatform,
            departure: element.depTime,
            departureDelay: element.depDelay,
            departurePlatform: element.fromRealtimePlatform || element.fromPlatform,
            cancelled: element.toCancelled
        }))
    ];
    const coordinates = stopovers
        .map(entry => entry.stop.location)
        .filter(location => {
            return Number.isFinite(location?.latitude)
                && Number.isFinite(location?.longitude);
        })
        .map(location => [location.longitude, location.latitude]);
    const id = context.journeyId || encodeTripContext(context);

    return {
        trip: {
            id,
            direction: context.direction || stopovers.at(-1)?.stop?.name || "",
            line: {
                type: "line",
                id: context.lineKey || context.lineId,
                name: context.lineName || "",
                product: context.product || "bus"
            },
            stopovers,
            polyline: {
                type: "Feature",
                properties: {},
                geometry: {
                    type: "LineString",
                    coordinates
                }
            }
        }
    };
}

function interpolateTrack(track, progress) {
    if (!Array.isArray(track) || track.length < 2) {
        return null;
    }

    const pointCount = Math.floor(track.length / 2);
    const position = Math.min(Math.max(progress, 0), 1) * (pointCount - 1);
    const startIndex = Math.floor(position);
    const endIndex = Math.min(startIndex + 1, pointCount - 1);
    const fraction = position - startIndex;
    const startLng = track[startIndex * 2];
    const startLat = track[startIndex * 2 + 1];
    const endLng = track[endIndex * 2];
    const endLat = track[endIndex * 2 + 1];

    return {
        longitude: startLng + (endLng - startLng) * fraction,
        latitude: startLat + (endLat - startLat) * fraction
    };
}

export function normalizeMovements(data, nowSeconds = Date.now() / 1000) {
    return (data.journeys || []).flatMap(journey => {
        const segment = (journey.segments || []).find(candidate => {
            const delaySeconds = Number(candidate.realtimeDelay || 0) * 60;
            return nowSeconds >= candidate.startDateTime + delaySeconds
                && nowSeconds <= candidate.endDateTime + delaySeconds;
        });

        if (!segment?.track?.track) {
            return [];
        }

        const delaySeconds = Number(segment.realtimeDelay || 0) * 60;
        const start = segment.startDateTime + delaySeconds;
        const end = segment.endDateTime + delaySeconds;
        const progress = end > start ? (nowSeconds - start) / (end - start) : 0;
        const location = interpolateTrack(segment.track.track, progress);

        if (!location) {
            return [];
        }

        const routeContext = {
            journeyId: journey.journeyID,
            stationId: segment.startStationKey,
            lineKey: journey.line?.id,
            lineId: journey.line?.dlid,
            lineName: journey.line?.name,
            product: productFromVehicleType(journey.vehicleType),
            direction: segment.destination || journey.line?.direction || "",
            time: new Date(Number(segment.startDateTime) * 1000).toISOString()
        };

        return [{
            tripId: journey.journeyID,
            routeId: encodeTripContext(routeContext),
            direction: segment.destination || journey.line?.direction || "",
            location,
            line: {
                type: "line",
                id: journey.line?.id,
                name: journey.line?.name || "",
                product: productFromVehicleType(journey.vehicleType)
            }
        }];
    });
}
