import { deliveryPayload } from "./triasXml.js";

function asArray(value) {
    if (value === undefined || value === null) {
        return [];
    }

    return Array.isArray(value) ? value : [value];
}

function text(value) {
    if (value === undefined || value === null) {
        return "";
    }

    if (typeof value === "object") {
        return text(value.Text ?? value.Value ?? value["#text"]);
    }

    return String(value);
}

function boolean(value) {
    return value === true || String(value).toLowerCase() === "true";
}

function iso(value) {
    const date = new Date(text(value));
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

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

function productFromMode(mode = {}) {
    const ptMode = text(mode.PtMode || mode).toLowerCase();
    const submode = text(
        mode.RailSubmode
        || mode.BusSubmode
        || mode.TramSubmode
        || mode.MetroSubmode
        || mode.WaterSubmode
    ).toLowerCase();

    if (/highspeed|intercity|international|night/iu.test(submode)) {
        return "express";
    }

    if (/suburban/iu.test(submode)) {
        return "suburban";
    }

    if (ptMode === "rail") {
        return "regional";
    }

    if (["metro", "underground"].includes(ptMode)) {
        return "subway";
    }

    if (ptMode === "tram") {
        return "tram";
    }

    if (ptMode === "water" || ptMode === "ferry") {
        return "ferry";
    }

    return "bus";
}

function productsFromMode(mode) {
    const products = emptyProducts();

    if (mode) {
        products[productFromMode(mode)] = true;
    }

    return products;
}

function geoPosition(value = {}) {
    const rawLatitude = text(value.Latitude);
    const rawLongitude = text(value.Longitude);
    const latitude = rawLatitude === "" ? Number.NaN : Number(rawLatitude);
    const longitude = rawLongitude === "" ? Number.NaN : Number(rawLongitude);

    return {
        type: "location",
        latitude,
        longitude
    };
}

function callStop(value = {}) {
    const call = value.CallAtStop || value;
    const location = geoPosition(call.GeoPosition);

    return {
        type: "stop",
        id: text(call.StopPointRef || call.StopPlaceRef),
        name: text(call.StopPointName || call.StopPlaceName || call.LocationName),
        location,
        products: emptyProducts(),
        lines: []
    };
}

export function normalizeLocationResult(result = {}) {
    const location = result.Location || result;
    const rawStop = location.StopPoint || location.StopPlace || location;
    const mode = rawStop.Mode || result.Mode;
    const stop = callStop({
        ...rawStop,
        GeoPosition: rawStop.GeoPosition || location.GeoPosition,
        LocationName: rawStop.LocationName || location.LocationName
    });

    stop.products = productsFromMode(mode);
    return stop;
}

export function normalizeLocations(document) {
    const response = deliveryPayload(document).LocationInformationResponse || {};

    return asArray(response.LocationResult)
        .map(normalizeLocationResult)
        .filter(stop => {
            return stop.id
                && stop.name
                && Number.isFinite(stop.location.latitude)
                && Number.isFinite(stop.location.longitude);
        });
}

function plannedAndEstimated(call, type) {
    const service = call?.[`Service${type}`] || {};
    const planned = iso(service.TimetabledTime);
    const estimated = iso(service.EstimatedTime) || planned;

    return { planned, estimated };
}

function lineFromService(service = {}) {
    const name = text(service.PublishedLineName)
        || text(service.LineRef)
        || text(service.JourneyRef);

    return {
        type: "line",
        id: text(service.LineRef) || name,
        name,
        product: productFromMode(service.Mode)
    };
}

function tripId(service = {}, fallback = "") {
    const journeyRef = text(service.JourneyRef);
    const operatingDayRef = text(service.OperatingDayRef);

    return [operatingDayRef, journeyRef].filter(Boolean).join("|") || fallback;
}

function platform(call = {}, estimated = true) {
    return text(
        estimated
            ? call.EstimatedBay || call.PlannedBay
            : call.PlannedBay
    ) || null;
}

function normalizeStopover(rawCall = {}) {
    const call = rawCall.CallAtStop || rawCall;
    const arrival = plannedAndEstimated(call, "Arrival");
    const departure = plannedAndEstimated(call, "Departure");

    return {
        stop: callStop(call),
        arrival: arrival.estimated,
        plannedArrival: arrival.planned,
        departure: departure.estimated,
        plannedDeparture: departure.planned,
        arrivalPlatform: platform(call),
        departurePlatform: platform(call),
        cancelled: boolean(call.NotServicedStop)
    };
}

function polyline(coordinates) {
    return coordinates.length >= 2 ? {
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates
        }
    } : null;
}

function projections(track = {}) {
    const coordinates = [];

    for (const section of asArray(track.TrackSection)) {
        for (const projection of asArray(section.Projection)) {
            const position = projection.Position || projection.GeoPosition || projection;
            const longitude = Number(text(position.Longitude));
            const latitude = Number(text(position.Latitude));
            const previous = coordinates.at(-1);

            if (
                Number.isFinite(longitude)
                && Number.isFinite(latitude)
                && (previous?.[0] !== longitude || previous?.[1] !== latitude)
            ) {
                coordinates.push([longitude, latitude]);
            }
        }
    }

    return coordinates;
}

function tripFromStopEvent(event, fallbackId) {
    const service = event.Service || {};
    const calls = [
        ...asArray(event.PreviousCall),
        event.ThisCall,
        ...asArray(event.OnwardCall)
    ].filter(Boolean);
    const stopovers = calls.map(normalizeStopover);
    const id = tripId(service, fallbackId);

    if (!id || stopovers.length === 0) {
        return null;
    }

    return {
        trip: {
            id,
            direction: text(service.DestinationText)
                || stopovers.at(-1)?.stop?.name
                || "",
            line: lineFromService(service),
            stopovers,
            polyline: null
        }
    };
}

export function normalizeStopEvents(document) {
    const response = deliveryPayload(document).StopEventResponse || {};
    const departures = [];
    const trips = [];

    for (const result of asArray(response.StopEventResult)) {
        const event = result.StopEvent || {};
        const call = event.ThisCall?.CallAtStop || event.ThisCall || {};
        const service = event.Service || {};
        const departure = plannedAndEstimated(call, "Departure");
        const plannedTimestamp = Date.parse(departure.planned);
        const estimatedTimestamp = Date.parse(departure.estimated);
        const id = tripId(service, text(result.ResultId || result.Id));
        const trip = tripFromStopEvent(event, id);

        if (trip) {
            trips.push(trip);
        }

        if (departure.estimated && lineFromService(service).name) {
            departures.push({
                tripId: id,
                direction: text(service.DestinationText)
                    || text(service.DestinationStopPointRef),
                when: departure.estimated,
                plannedWhen: departure.planned,
                delay: Number.isFinite(plannedTimestamp) && Number.isFinite(estimatedTimestamp)
                    ? Math.round((estimatedTimestamp - plannedTimestamp) / 1000)
                    : 0,
                platform: platform(call),
                plannedPlatform: platform(call, false),
                cancelled: boolean(call.NotServicedStop)
                    || boolean(event.Cancelled)
                    || boolean(service.Cancelled),
                line: lineFromService(service)
            });
        }
    }

    return { departures, trips };
}

function timedLeg(raw = {}) {
    const board = raw.LegBoard || {};
    const alight = raw.LegAlight || {};
    const service = raw.Service || {};
    const departure = plannedAndEstimated(board, "Departure");
    const arrival = plannedAndEstimated(alight, "Arrival");
    const stopovers = [
        normalizeStopover(board),
        ...asArray(raw.LegIntermediates).map(normalizeStopover),
        normalizeStopover(alight)
    ];
    const coordinates = projections(raw.LegTrack);
    const id = tripId(service, text(raw.LegId));
    const detail = {
        trip: {
            id,
            direction: text(service.DestinationText) || callStop(alight).name,
            line: lineFromService(service),
            stopovers,
            polyline: polyline(coordinates)
        }
    };

    return {
        leg: {
            tripId: id,
            walking: false,
            origin: callStop(board),
            destination: callStop(alight),
            departure: departure.estimated,
            plannedDeparture: departure.planned,
            arrival: arrival.estimated,
            plannedArrival: arrival.planned,
            departurePlatform: platform(board),
            arrivalPlatform: platform(alight),
            direction: detail.trip.direction,
            cancelled: stopovers.some(stopover => stopover.cancelled),
            line: detail.trip.line,
            polyline: detail.trip.polyline
        },
        detail
    };
}

function walkingLeg(raw = {}) {
    const start = raw.LegStart || {};
    const end = raw.LegEnd || {};
    const departure = iso(raw.TimeWindowStart);
    const arrival = iso(raw.TimeWindowEnd);

    return {
        tripId: "",
        walking: true,
        origin: callStop(start),
        destination: callStop(end),
        departure,
        plannedDeparture: departure,
        arrival,
        plannedArrival: arrival,
        departurePlatform: null,
        arrivalPlatform: null,
        direction: callStop(end).name,
        cancelled: false,
        line: null,
        polyline: polyline(projections(raw.LegTrack))
    };
}

export function normalizeJourneys(document) {
    const response = deliveryPayload(document).TripResponse || {};
    const journeys = [];
    const trips = [];

    asArray(response.TripResult).forEach((result, index) => {
        const rawTrip = result.Trip || {};
        const legs = [];

        for (const rawLeg of asArray(rawTrip.TripLeg)) {
            if (rawLeg.TimedLeg) {
                const normalized = timedLeg(rawLeg.TimedLeg);
                legs.push(normalized.leg);
                trips.push(normalized.detail);
            } else {
                const rawWalking = rawLeg.ContinuousLeg || rawLeg.InterchangeLeg;

                if (rawWalking) {
                    legs.push(walkingLeg(rawWalking));
                }
            }
        }

        if (legs.length === 0) {
            return;
        }

        const departure = legs[0].departure;
        const arrival = legs.at(-1).arrival;
        const transitLegs = legs.filter(leg => !leg.walking);
        const calculatedDuration = Date.parse(arrival) - Date.parse(departure);

        journeys.push({
            id: text(rawTrip.TripId || result.ResultId || result.Id) || String(index),
            departure,
            plannedDeparture: legs[0].plannedDeparture,
            arrival,
            plannedArrival: legs.at(-1).plannedArrival,
            duration: Number.isFinite(calculatedDuration)
                ? Math.max(0, calculatedDuration / 1000)
                : 0,
            transfers: Math.max(0, transitLegs.length - 1),
            legs
        });
    });

    return { journeys, trips };
}
