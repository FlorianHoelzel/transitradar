import assert from "node:assert/strict";
import test from "node:test";

import {
    decodeTripContext,
    encodeTripContext,
    normalizeCourse,
    normalizeProducts,
    normalizeStop
} from "../src/normalizers.js";

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
