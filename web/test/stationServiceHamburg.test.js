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
const { stationLines } = await import("../js/ui/stationRanking.js");

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
            ["RB71", "RB81", "RE8", "RE80"]
        ),
        stop(
            "Master:10905",
            "Hauptbahnhof Nord",
            53.554113,
            10.005936,
            { subway: true },
            ["U2", "U4"]
        ),
        stop(
            "Master:10906",
            "Hauptbahnhof Süd",
            53.551979,
            10.009583,
            { subway: true },
            ["U1", "U3"]
        )
    ]);

    assert.equal(stations.length, 1);
    assert.equal(stations[0].name, "Hauptbahnhof");
    assert.equal(stations[0].id, "Master:9910950");
    assert.deepEqual(stations[0].coordinates, [53.552483, 10.007407]);
    assert.deepEqual(
        stations[0].stops.map(candidate => candidate.id),
        ["Master:10002", "Master:9910950", "Master:10905", "Master:10906"]
    );
    assert.deepEqual(
        stationLines(stations[0]).slice(0, 4),
        ["U1", "U2", "U3", "U4"]
    );
});

test("keeps S-Bahn stations on the western HVV corridor through Stade", () => {
    const stations = prepareStations([
        stop(
            "Master:8000089",
            "Stade",
            53.5962,
            9.4761,
            { suburban: true, regional: true },
            ["S5", "RE5"]
        )
    ]);

    assert.equal(stations.length, 1);
    assert.equal(stations[0].name, "Stade");
    assert.deepEqual(stations[0].lines, ["RE5", "S5"]);
});
