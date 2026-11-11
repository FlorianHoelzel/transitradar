import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = { location: { hostname: "db.transitradar.de" } };
const { getDbTrainPosition, getDbUpcomingStops, normalizeDbTrainTrips } = await import("../js/api/dbTrainTrips.js");

const departure = "2026-11-11T11:00:00Z";
const arrival = "2026-11-11T11:10:00Z";
const polyline = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

function segment(overrides = {}) {
    return {
        trips: [{ tripId: "ice-612", displayName: "ICE 612" }],
        mode: "HIGHSPEED_RAIL",
        departure,
        arrival,
        polyline,
        to: { name: "Berlin Hbf" },
        ...overrides
    };
}

test("interpolates along the encoded shape and only during an active trip leg", () => {
    const train = normalizeDbTrainTrips([segment()], { overview: true, precision: 5 }).get("ICE 612");
    assert.deepEqual(getDbTrainPosition(train, Date.parse(departure)).coordinates, [38.5, -120.2]);
    const midpoint = getDbTrainPosition(train, Date.parse("2026-11-11T11:05:00Z")).coordinates;
    assert(midpoint[0] > 40.7 && midpoint[0] < 43.252);
    assert(midpoint[1] < -120.95 && midpoint[1] > -126.453);
    assert.equal(getDbTrainPosition(train, Date.parse(arrival)), null);
});

test("decodes the lower precision used for the Germany overview", () => {
    const [train] = normalizeDbTrainTrips([segment({ polyline: "cgIqrAAC" })], {
        overview: true,
        precision: 2
    }).values();
    assert.deepEqual(train.paths[0].points, [[52.5, 13.37], [52.51, 13.39]]);
});

test("keeps only ICE in the overview and excludes S-Bahn from detail", () => {
    const segments = [
        segment(),
        segment({ mode: "REGIONAL_RAIL", trips: [{ tripId: "re-7", displayName: "RE7 (4280)" }] }),
        segment({ mode: "REGIONAL_RAIL", trips: [{ tripId: "s-1", displayName: "S1 (1234)" }] }),
        segment({ mode: "LONG_DISTANCE", trips: [{ tripId: "ic-1", displayName: "IC 119" }] })
    ];
    assert.deepEqual([...normalizeDbTrainTrips(segments, { overview: true, precision: 5 }).keys()], ["ICE 612"]);
    const detail = normalizeDbTrainTrips(segments, { overview: false, precision: 5 });
    assert.equal(detail.get("re-7").name, "RE7");
    assert.equal(detail.has("s-1"), false);
});

test("prefers the real-time path when two feeds report the same ICE", () => {
    const train = normalizeDbTrainTrips([
        segment({ realTime: true, to: { name: "Berlin Südkreuz" } }),
        segment({ trips: [{ tripId: "duplicate-612", displayName: "ICE 612" }] })
    ], { overview: true, precision: 5 }).get("ICE 612");
    const { path } = getDbTrainPosition(train, Date.parse("2026-11-11T11:03:00Z"));
    assert.equal(path.nextStop, "Berlin Südkreuz");
    assert.equal(path.realTime, true);
    assert.equal(path.tripId, "ice-612");
});

test("starts the route at the matching upcoming stop and keeps the final destination", () => {
    const stopovers = [
        { name: "Berlin Hbf", parentId: "hbf", departure: "2026-11-11T10:00:00Z" },
        { name: "Berlin Südkreuz", stopId: "suedkreuz", arrival: "2026-11-11T10:10:00Z" },
        { name: "Berlin Hbf", parentId: "hbf", arrival },
        { name: "Berlin-Spandau", stopId: "spandau", arrival: "2026-11-11T11:20:00Z" },
        { name: "Hamburg Hbf", stopId: "hamburg", arrival: "2026-11-11T13:00:00Z" }
    ];
    const path = { toStopId: "hbf", arrival: Date.parse(arrival) };
    assert.deepEqual(getDbUpcomingStops(stopovers, path).map(stop => stop.name), [
        "Berlin Hbf", "Berlin-Spandau", "Hamburg Hbf"
    ]);
    assert.deepEqual(getDbUpcomingStops(stopovers, { ...path, toStopId: "hamburg" }), [
        { name: "Hamburg Hbf" }
    ]);
});
