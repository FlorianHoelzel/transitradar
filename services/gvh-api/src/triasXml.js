import { XMLParser } from "fast-xml-parser";

const ARRAY_ELEMENTS = new Set([
    "LocationResult",
    "StopEventResult",
    "PreviousCall",
    "OnwardCall",
    "TripResult",
    "TripLeg",
    "LegIntermediates",
    "TrackSection",
    "Projection"
]);

const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true,
    isArray: tagName => ARRAY_ELEMENTS.has(tagName)
});

export function escapeXml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&apos;");
}

export function serviceRequest(payload, requestorRef, timestamp = new Date()) {
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Trias version="1.2" xmlns="http://www.vdv.de/trias" ',
        'xmlns:siri="http://www.siri.org.uk/siri">',
        "<ServiceRequest>",
        `<siri:RequestTimestamp>${escapeXml(timestamp.toISOString())}</siri:RequestTimestamp>`,
        `<siri:RequestorRef>${escapeXml(requestorRef)}</siri:RequestorRef>`,
        "<Language>deu</Language>",
        "<RequestPayload>",
        payload,
        "</RequestPayload>",
        "</ServiceRequest>",
        "</Trias>"
    ].join("");
}

export function locationInformationRequest({
    query,
    latitude,
    longitude,
    bounds,
    results = 10,
    continueAt,
    includePtModes = true
}) {
    const initialInput = query
        ? `<LocationName>${escapeXml(query)}</LocationName>`
        : bounds
            ? [
                "<GeoRestriction>",
                "<Rectangle>",
                "<UpperLeft>",
                `<Longitude>${escapeXml(bounds.minLng)}</Longitude>`,
                `<Latitude>${escapeXml(bounds.maxLat)}</Latitude>`,
                "</UpperLeft>",
                "<LowerRight>",
                `<Longitude>${escapeXml(bounds.maxLng)}</Longitude>`,
                `<Latitude>${escapeXml(bounds.minLat)}</Latitude>`,
                "</LowerRight>",
                "</Rectangle>",
                "</GeoRestriction>"
            ].join("")
            : [
            "<GeoPosition>",
            `<Longitude>${escapeXml(longitude)}</Longitude>`,
            `<Latitude>${escapeXml(latitude)}</Latitude>`,
            "</GeoPosition>"
        ].join("");

    return [
        "<LocationInformationRequest>",
        `<InitialInput>${initialInput}</InitialInput>`,
        "<Restrictions>",
        "<Type>stop</Type>",
        `<NumberOfResults>${escapeXml(results)}</NumberOfResults>`,
        Number.isFinite(continueAt)
            ? `<ContinueAt>${escapeXml(continueAt)}</ContinueAt>`
            : "",
        `<IncludePtModes>${includePtModes ? "true" : "false"}</IncludePtModes>`,
        "</Restrictions>",
        "</LocationInformationRequest>"
    ].join("");
}

export function stopEventRequest({
    stopPointRef,
    departureTime,
    results = 20
}) {
    return [
        "<StopEventRequest>",
        "<Location>",
        "<LocationRef>",
        `<StopPointRef>${escapeXml(stopPointRef)}</StopPointRef>`,
        "</LocationRef>",
        `<DepArrTime>${escapeXml(departureTime)}</DepArrTime>`,
        "</Location>",
        "<Params>",
        `<NumberOfResults>${escapeXml(results)}</NumberOfResults>`,
        "<StopEventType>departure</StopEventType>",
        "<IncludePreviousCalls>false</IncludePreviousCalls>",
        "<IncludeOnwardCalls>true</IncludeOnwardCalls>",
        "<IncludeRealtimeData>true</IncludeRealtimeData>",
        "</Params>",
        "</StopEventRequest>"
    ].join("");
}

function endpoint(name, stopPointRef, time) {
    return [
        `<${name}>`,
        "<LocationRef>",
        `<StopPointRef>${escapeXml(stopPointRef)}</StopPointRef>`,
        "</LocationRef>",
        time ? `<DepArrTime>${escapeXml(time)}</DepArrTime>` : "",
        `</${name}>`
    ].join("");
}

export function tripRequest({
    originRef,
    destinationRef,
    departureTime,
    arrivalTime,
    results = 5
}) {
    return [
        "<TripRequest>",
        endpoint("Origin", originRef, arrivalTime ? null : departureTime),
        endpoint("Destination", destinationRef, arrivalTime),
        "<Params>",
        `<NumberOfResults>${escapeXml(results)}</NumberOfResults>`,
        "<IncludeTrackSections>true</IncludeTrackSections>",
        "<IncludeLegProjection>true</IncludeLegProjection>",
        "<IncludeIntermediateStops>true</IncludeIntermediateStops>",
        "</Params>",
        "</TripRequest>"
    ].join("");
}

export function parseTriasXml(xml) {
    return parser.parse(xml);
}

export function deliveryPayload(document) {
    return document?.Trias?.ServiceDelivery?.DeliveryPayload || {};
}

export function upstreamError(document) {
    const delivery = document?.Trias?.ServiceDelivery || {};
    const error = delivery.ErrorMessage
        || deliveryPayload(document).ErrorMessage
        || deliveryPayload(document).ErrorCondition;

    if (!error) {
        return null;
    }

    return error.Text?.Text || error.Text || error.Description?.Text || "TRIAS request failed.";
}
