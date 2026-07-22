import assert from "node:assert/strict";
import test from "node:test";

import { REGULAR_S_BAHN_LINES } from "../src/regularLines.js";
import { getStationLines } from "../src/stationLineCatalog.js";
import {
    createStationLinesById,
    decodeTripContext,
    encodeTripContext,
    normalizeCourse,
    normalizeJourneys,
    normalizeProducts,
    normalizeStop
} from "../src/normalizers.js";

test("normalizes Geofox route schedules into journeys", () => {
    const journeys = normalizeJourneys({
        realtimeSchedules: [{
            routeId: 7,
            time: 18,
            scheduleElements: [{
                from: {
                    id: "Master:1",
                    name: "Start",
                    coordinate: { x: 9.99, y: 53.55 },
                    depTime: { date: "22.07.2026", time: "12:00" }
                },
                to: {
                    id: "Master:2",
                    name: "Ziel",
                    coordinate: { x: 10.01, y: 53.57 },
                    arrTime: { date: "22.07.2026", time: "12:18" }
                },
                line: {
                    id: "U3",
                    name: "U3",
                    direction: "Wandsbek-Gartenstadt",
                    type: { simpleType: "U" }
                },
                paths: [{ track: [{ x: 9.99, y: 53.55 }, { x: 10.01, y: 53.57 }] }]
            }]
        }]
    });

    assert.equal(journeys.length, 1);
    assert.equal(journeys[0].duration, 18 * 60);
    assert.equal(journeys[0].transfers, 0);
    assert.equal(journeys[0].legs[0].line.name, "U3");
    assert.equal(journeys[0].legs[0].line.product, "subway");
    assert.deepEqual(
        journeys[0].legs[0].polyline.geometry.coordinates,
        [[9.99, 53.55], [10.01, 53.57]]
    );
});

test("normalizes Geofox station coordinates and products", () => {
    const stop = normalizeStop({
        id: "Master:80953",
        combinedName: "Hamburg, Altona",
        coordinate: { x: 9.93454, y: 53.552405 },
        vehicleTypes: ["S_BAHN", "REGIONALBUS"]
    });

    assert.equal(stop.id, "Master:80953");
    assert.equal(stop.location.latitude, 53.552405);
    assert.equal(stop.location.longitude, 9.93454);
    assert.equal(stop.products.suburban, true);
    assert.equal(stop.products.bus, true);
});

test("normalizes short Geofox service type names", () => {
    const products = normalizeProducts(["u", "s", "ship"]);

    assert.equal(products.subway, true);
    assert.equal(products.suburban, true);
    assert.equal(products.ferry, true);
});

test("combines Geofox lines with disruption-independent regular lines", () => {
    const stationLines = createStationLinesById([
        {
            name: "S3",
            exists: true,
            sublines: [{
                stationSequence: [
                    { id: "Master:40950", name: "Harburg Rathaus" },
                    { id: "Master:49950", name: "Harburg" }
                ]
            }]
        },
    ], [{
        name: "S5",
        stationIds: [
            "Master:51989",
            "Master:40950",
            "Master:49950",
            "Master:54018"
        ]
    }]);

    assert.deepEqual(stationLines.get("Master:40950"), ["S3", "S5"]);
    assert.deepEqual(stationLines.get("Master:49950"), ["S3", "S5"]);
    assert.deepEqual(stationLines.get("Master:51989"), ["S5"]);
    assert.deepEqual(stationLines.get("Master:54018"), ["S5"]);
});

test("keeps regular southern S-Bahn lines during disruptions", () => {
    const stationLines = createStationLinesById([], REGULAR_S_BAHN_LINES);

    assert.deepEqual(stationLines.get("Master:54018"), ["S3", "S5"]);
    assert.deepEqual(stationLines.get("Master:49950"), ["S3", "S5"]);
    assert.deepEqual(stationLines.get("Master:40950"), ["S3", "S5"]);
    assert.deepEqual(stationLines.get("Master:51989"), ["S5"]);
});

test("loads every scheduled mode from the generated station catalog", () => {
    assert.deepEqual(
        getStationLines("Master:54951"),
        ["13", "151", "152", "153", "154", "155", "156", "351", "355", "S3", "S5"]
    );
    assert.equal(getStationLines("Master:54018").includes("13"), true);
    assert.equal(getStationLines("Master:54018").includes("S3-SEV"), false);
    assert.equal(getStationLines("Master:51989").includes("S5-SEV"), false);
    assert.equal(getStationLines("Master:11943").includes("111"), true);
    assert.equal(getStationLines("Master:11943").includes("130"), true);
    assert.equal(getStationLines("Master:11943").includes("U4"), true);
    assert.deepEqual(getStationLines("Master:47003"), ["2804-AST"]);
    assert.deepEqual(getStationLines("Master:80317"), ["8119-AST"]);
    assert.deepEqual(getStationLines("Master:99880"), ["6669-AST"]);
    assert.deepEqual(
        getStationLines("Master:51989").filter(line => /^S\d+$/u.test(line)),
        ["S5"]
    );
    assert.equal(getStationLines("Master:10954").includes("S2"), true);
});

test("round-trips opaque trip context tokens", () => {
    const context = {
        stationId: "Master:80953",
        lineKey: "VHH:15_VHH",
        direction: "Alsterchaussee"
    };

    assert.deepEqual(decodeTripContext(encodeTripContext(context)), context);
});

test("builds trip stopovers and fallback geometry from a course", () => {
    const result = normalizeCourse({
        courseElements: [{
            fromStation: {
                id: "Master:1",
                name: "Start",
                coordinate: { x: 9.9, y: 53.5 }
            },
            toStation: {
                id: "Master:2",
                name: "Destination",
                coordinate: { x: 10, y: 53.6 }
            },
            depTime: "2026-07-13T20:00:00.000+0200",
            arrTime: "2026-07-13T20:10:00.000+0200"
        }]
    }, {
        journeyId: "journey-1",
        lineName: "U1",
        product: "subway",
        direction: "Destination"
    });

    assert.equal(result.trip.id, "journey-1");
    assert.equal(result.trip.stopovers.length, 2);
    assert.deepEqual(
        result.trip.polyline.geometry.coordinates,
        [[9.9, 53.5], [10, 53.6]]
    );
});
