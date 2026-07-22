import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = {
    location: {
        hostname: "hamburg.transitradar.de",
        protocol: "https:",
        search: ""
    }
};

const { prepareStations } = await import("../js/stations/stationService.js");

function stop(id, name, latitude, longitude, products, lines) {
    return {
        id,
        name,
        location: { latitude, longitude },
        products,
        lines
    };
}

test("uses the multimodal Hamburg Hauptbahnhof stop for journey routing", () => {
    const stations = prepareStations([
        stop(
            "Master:10002",
            "Hauptbahnhof/ZOB",
            53.551901,
            10.010335,
            { bus: true },
            ["2", "3", "5"]
        ),
        stop(
            "Master:9910950",
            "Hauptbahnhof",
            53.552483,
            10.007407,
            {
                express: true,
                regional: true,
                suburban: true,
                subway: true,
                bus: true
            },
            ["RE8", "S1", "U1", "2"]
        )
    ]);

    assert.equal(stations.length, 1);
    assert.equal(stations[0].name, "Hauptbahnhof");
    assert.equal(stations[0].id, "Master:9910950");
    assert.deepEqual(stations[0].coordinates, [53.552483, 10.007407]);
    assert.deepEqual(
        stations[0].stops.map(candidate => candidate.id),
        ["Master:10002", "Master:9910950"]
    );
});
