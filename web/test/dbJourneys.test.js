import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = { location: { hostname: "db.transitradar.de" } };
const { normalizeDbJourneys } = await import("../js/api/dbJourneys.js");

test("converts DB journey geometries and excludes cancelled or S-Bahn routes", () => {
    const walking = { mode: "WALK", from: { lat: 52.5, lon: 13.37 } };
    const ice = {
        mode: "HIGHSPEED_RAIL",
        displayName: "ICE 612",
        legGeometry: { points: "cgIqrAAC", precision: 2 }
    };
    const itineraries = [
        { legs: [walking, ice] },
        { legs: [walking] },
        { legs: [ice, { mode: "REGIONAL_RAIL", displayName: "S1 (181)" }] },
        { legs: [{ ...ice, cancelled: true }] }
    ];

    const [journey, ...others] = normalizeDbJourneys(itineraries);
    assert.equal(others.length, 0);
    assert.equal(journey.legs[0].walking, true);
    assert.equal(journey.legs[1].line.name, "ICE 612");
    assert.deepEqual(journey.legs[1].polyline.coordinates, [[13.37, 52.5], [13.39, 52.51]]);
});
