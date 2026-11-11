import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = { location: { hostname: "db.transitradar.de" } };
const { normalizeDbDepartures } = await import("../js/api/dbDepartures.js");

const station = { name: "Hamburg, Hamburg Hbf" };
const now = Date.parse("2026-11-11T10:00:00Z");
const planned = "2026-11-11T10:15:00Z";

function stopTime(overrides = {}) {
    return {
        place: { name: "Hamburg Hauptbahnhof", scheduledDeparture: planned, departure: planned },
        mode: "REGIONAL_RAIL",
        routeShortName: "RE8",
        tripShortName: "01008",
        headsign: "Lübeck Hbf",
        ...overrides
    };
}

test("uses only the selected station's ICE and regional departures", () => {
    const board = normalizeDbDepartures(station, [
        stopTime(),
        stopTime({ mode: "SUBURBAN", routeShortName: "S1" }),
        stopTime({ routeShortName: "RS1" }),
        stopTime({ routeShortName: "S4" }),
        stopTime({ mode: "LONG_DISTANCE", routeShortName: "IC 123" }),
        stopTime({ mode: "HIGHSPEED_RAIL", routeShortName: "42", tripShortName: "ICE 611" }),
        stopTime({ place: { name: "Hamburg Dammtor", scheduledDeparture: planned } })
    ], now);

    assert.deepEqual(board.map(row => row.line.name), ["RE8", "ICE 611"]);
});

test("prefers a realtime update to a duplicate timetable departure", () => {
    const board = normalizeDbDepartures(station, [
        stopTime(),
        stopTime({
            place: { name: "Hamburg Hbf", scheduledDeparture: planned, departure: "2026-11-11T10:21:00Z" },
            tripShortName: "1008",
            realTime: true
        })
    ], now);

    assert.equal(board.length, 1);
    assert.equal(board[0].delay, 360);
    assert.equal(board[0].plannedWhen, planned);
});

test("keeps cancelled departures at their scheduled time", () => {
    const board = normalizeDbDepartures(station, [
        stopTime(),
        stopTime({ place: { name: "Hamburg Hbf", scheduledDeparture: planned }, tripCancelled: true })
    ], now);

    assert.equal(board.length, 1);
    assert.equal(board[0].cancelled, true);
    assert.equal(board[0].when, planned);
});

test("merges the same ICE from feeds with different destinations", () => {
    const board = normalizeDbDepartures(station, [
        stopTime({ mode: "HIGHSPEED_RAIL", tripShortName: "ICE 1205", headsign: "Innsbruck Hbf" }),
        stopTime({ mode: "HIGHSPEED_RAIL", tripShortName: "ICE 1205", headsign: "Kufstein", realTime: true })
    ], now);

    assert.equal(board.length, 1);
    assert.equal(board[0].direction, "Kufstein");
});
