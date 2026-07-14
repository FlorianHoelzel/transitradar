import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizeDeparture,
    normalizeDepartures,
    normalizeLocations,
    normalizeProducts,
    normalizeStop
} from "../src/normalizers.js";

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
