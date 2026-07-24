import assert from "node:assert/strict";
import test from "node:test";

import {
    filterStopsByBounds,
    normalizeDeparture,
    normalizeDepartures,
    normalizeJourneys,
    normalizeJourneyDetail,
    normalizeLocations,
    normalizeProducts,
    normalizeStop
} from "../src/normalizers.js";

test("normalizes RMV trip results into journeys", () => {
    const journeys = normalizeJourneys({
        Trip: [{
            ctxRecon: "journey-context",
            LegList: {
                Leg: [{
                    Origin: {
                        extId: "3000010",
                        name: "Frankfurt Hbf",
                        lon: 8.663767,
                        lat: 50.107158,
                        date: "2026-07-22",
                        time: "12:00:00"
                    },
                    Destination: {
                        extId: "3006907",
                        name: "Konstablerwache",
                        lon: 8.6874,
                        lat: 50.1148,
                        date: "2026-07-22",
                        time: "12:08:00"
                    },
                    Product: [{ name: "S8", cls: "8" }],
                    JourneyDetailRef: { ref: "trip-reference" },
                    PolylineGroup: {
                        polylineDesc: [{ crd: [8.663767, 50.107158, 8.6874, 50.1148] }]
                    }
                }]
            }
        }]
    });

    assert.equal(journeys.length, 1);
    assert.equal(journeys[0].id, "journey-context");
    assert.equal(journeys[0].duration, 8 * 60);
    assert.equal(journeys[0].legs[0].tripId, "trip-reference");
    assert.equal(journeys[0].legs[0].line.product, "suburban");
    assert.deepEqual(
        journeys[0].legs[0].polyline.geometry.coordinates,
        [[8.663767, 50.107158], [8.6874, 50.1148]]
    );
});

const frankfurtCentral = {
    extId: "3000010",
    id: "A=1@O=Frankfurt (Main) Hauptbahnhof@X=8663767@Y=50107158@U=80@L=3000010@",
    name: "Frankfurt (Main) Hauptbahnhof",
    lon: 8.663767,
    lat: 50.107158,
    productAtStop: [
        { name: "ICE", cls: "1" },
        { name: "RE30", cls: "4" },
        { name: "S8", cls: "8" },
        { name: "U4", cls: "16" },
        { name: "Tram 11", cls: "32" },
        { name: "Bus 64", cls: "64" }
    ]
};

test("normalizes RMV station identity, coordinates, products, and lines", () => {
    const stop = normalizeStop(frankfurtCentral);

    assert.equal(stop.type, "stop");
    assert.equal(stop.id, "3000010");
    assert.equal(stop.location.latitude, 50.107158);
    assert.equal(stop.location.longitude, 8.663767);
    assert.equal(stop.products.express, true);
    assert.equal(stop.products.regional, true);
    assert.equal(stop.products.suburban, true);
    assert.equal(stop.products.subway, true);
    assert.equal(stop.products.tram, true);
    assert.equal(stop.products.bus, true);
    assert.deepEqual(stop.lines, ["ICE", "RE30", "S8", "U4", "Tram 11", "Bus 64"]);
});

test("supports HAFAS product bit masks", () => {
    const products = normalizeProducts([], 96);

    assert.equal(products.tram, true);
    assert.equal(products.bus, true);
    assert.equal(products.subway, false);
});

test("filters coordinate locations and stops without coordinates", () => {
    const locations = normalizeLocations({
        stopLocationOrCoordLocation: [
            { StopLocation: frankfurtCentral },
            { CoordLocation: { name: "Frankfurt" } },
            { StopLocation: { extId: "missing-coordinates", name: "Invalid" } }
        ]
    });

    assert.equal(locations.length, 1);
    assert.equal(locations[0].id, "3000010");
});

test("filters normalized stops to the configured city bounds", () => {
    const stops = [
        normalizeStop(frankfurtCentral),
        normalizeStop({
            ...frankfurtCentral,
            extId: "outside",
            name: "Outside",
            lat: 51,
            lon: 9
        })
    ];
    const filtered = filterStopsByBounds(stops, {
        minLat: 49.98,
        maxLat: 50.25,
        minLng: 8.40,
        maxLng: 8.85
    });

    assert.deepEqual(filtered.map(stop => stop.id), ["3000010"]);
});

test("normalizes planned and realtime RMV departures", () => {
    const departure = normalizeDeparture({
        JourneyDetailRef: { ref: "journey-reference" },
        JourneyStatus: "P",
        ProductAtStop: {
            name: "ICE 22",
            matchId: "ICE22",
            cls: "1"
        },
        platform: { type: "PL", text: "6" },
        rtPlatform: { type: "PL", text: "5" },
        date: "2026-07-14",
        time: "21:42:00",
        rtDate: "2026-07-14",
        rtTime: "21:56:00",
        direction: "Dortmund Hbf"
    });

    assert.equal(departure.tripId, "journey-reference");
    assert.equal(departure.direction, "Dortmund Hbf");
    assert.equal(departure.plannedWhen, "2026-07-14T19:42:00.000Z");
    assert.equal(departure.when, "2026-07-14T19:56:00.000Z");
    assert.equal(departure.delay, 14 * 60);
    assert.equal(departure.platform, "5");
    assert.equal(departure.plannedPlatform, "6");
    assert.equal(departure.line.name, "ICE 22");
    assert.equal(departure.line.product, "express");
});

test("filters incomplete departures", () => {
    const departures = normalizeDepartures({
        Departure: [
            {
                JourneyDetailRef: { ref: "valid" },
                ProductAtStop: { name: "S8", cls: "8" },
                date: "2026-07-14",
                time: "21:42:00"
            },
            { JourneyDetailRef: { ref: "missing-time" }, name: "Bus 64" }
        ]
    });

    assert.equal(departures.length, 1);
    assert.equal(departures[0].line.product, "suburban");
});

test("normalizes RMV journey stopovers and polyline geometry", () => {
    const result = normalizeJourneyDetail({
        ref: "journey-reference",
        Stops: {
            Stop: [
                {
                    extId: "start",
                    name: "Start",
                    lon: 8.6,
                    lat: 50.1,
                    depDate: "2026-07-14",
                    depTime: "21:00:00",
                    rtDepDate: "2026-07-14",
                    rtDepTime: "21:02:00",
                    depPlatform: { text: "1" },
                    rtDepPlatform: { text: "2" }
                },
                {
                    extId: "destination",
                    name: "Destination",
                    lon: 8.7,
                    lat: 50.2,
                    arrDate: "2026-07-14",
                    arrTime: "21:20:00"
                }
            ]
        },
        Product: [{ name: "S8", matchId: "S8", cls: "8" }],
        Directions: { Direction: [{ value: "Destination" }] },
        PolylineGroup: {
            polylineDesc: [{ crd: [8.6, 50.1, 8.65, 50.15, 8.7, 50.2] }]
        }
    });

    assert.equal(result.trip.id, "journey-reference");
    assert.equal(result.trip.direction, "Destination");
    assert.equal(result.trip.line.name, "S8");
    assert.equal(result.trip.line.product, "suburban");
    assert.equal(result.trip.stopovers.length, 2);
    assert.equal(result.trip.stopovers[0].departure, "2026-07-14T19:02:00.000Z");
    assert.equal(result.trip.stopovers[0].plannedDeparture, "2026-07-14T19:00:00.000Z");
    assert.equal(result.trip.stopovers[0].departurePlatform, "2");
    assert.deepEqual(
        result.trip.polyline.geometry.coordinates,
        [[8.6, 50.1], [8.65, 50.15], [8.7, 50.2]]
    );
});

test("does not invent RMV track geometry from stop coordinates", () => {
    const result = normalizeJourneyDetail({
        Stops: {
            Stop: [
                { extId: "a", name: "A", lon: 8.6, lat: 50.1 },
                { extId: "b", name: "B", lon: 8.7, lat: 50.2 }
            ]
        },
        Product: [{ name: "Bus 64", cls: "64" }]
    }, { journeyId: "fallback" });

    assert.equal(result.trip.id, "fallback");
    assert.equal(result.trip.polyline, null);
});

test("returns null for an empty journey response", () => {
    assert.equal(normalizeJourneyDetail({}), null);
});
