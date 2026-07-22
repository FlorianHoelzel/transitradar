import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = {
    location: {
        hostname: "berlin.transitradar.de",
        protocol: "https:",
        search: ""
    }
};

const { rankStations } = await import("../js/ui/stationRanking.js");

function station(name, latitude, longitude, products, lines) {
    return {
        id: name,
        name,
        location: { latitude, longitude },
        products,
        lines
    };
}

test("ranks Berlin Hauptbahnhof above streets and out-of-city Hauptbahnhöfe", () => {
    const results = rankStations([
        station("Hauptstr.", 52.52, 13.41, { bus: true }, ["107", "122", "124"]),
        station("Potsdam, Hauptbahnhof", 52.391, 13.067, { regional: true, suburban: true, tram: true, bus: true }, ["S1", "RE1", "RB23"]),
        station("S+U Berlin Hauptbahnhof", 52.525, 13.369, { express: true, regional: true, suburban: true, subway: true, tram: true, bus: true }, ["ICE", "RE1", "S3", "U5"]),
        station("Hennigsdorf, Hauptstr.", 52.637, 13.204, { bus: true }, ["807", "808"])
    ], "haupt");

    assert.equal(results[0].name, "S+U Berlin Hauptbahnhof");
    assert.deepEqual(
        results.map(result => result.name),
        [
            "S+U Berlin Hauptbahnhof",
            "Potsdam, Hauptbahnhof",
            "Hauptstr.",
            "Hennigsdorf, Hauptstr."
        ]
    );
});

test("keeps strong text relevance while using importance as a tie-breaker", () => {
    const results = rankStations([
        station("Alexanderplatz", 52.521, 13.413, { tram: true, bus: true }, ["M4", "100"]),
        station("S+U Alexanderplatz Bhf", 52.521, 13.413, { suburban: true, subway: true, tram: true, bus: true }, ["S3", "U2", "M4"]),
        station("Alexanderstraße", 52.522, 13.418, { bus: true }, ["200"])
    ], "alexander");

    assert.equal(results[0].name, "S+U Alexanderplatz Bhf");
});
