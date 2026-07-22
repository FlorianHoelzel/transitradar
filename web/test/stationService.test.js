import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = {
    location: {
        hostname: "frankfurt.transitradar.de",
        protocol: "https:",
        search: ""
    }
};

const { prepareStations } = await import("../js/stations/stationService.js");
const {
    getDisplayStationName,
    getSearchStationName
} = await import("../js/stations/stationNames.js");

function createStop(id, name, latitude, longitude, products, lines) {
    return {
        id,
        name,
        location: {
            latitude,
            longitude
        },
        products,
        lines
    };
}

test("groups Frankfurt Hauptbahnhof access stops under the aggregate station", () => {
    const surfaceProducts = {
        tram: true,
        bus: true
    };
    const stations = prepareStations([
        createStop(
            "3000008",
            "Frankfurt (Main) Hauptbahnhof/Münchener Straße",
            50.106934,
            8.666222,
            surfaceProducts,
            ["Tram 17", "Bus N4"]
        ),
        createStop(
            "3060865",
            "Frankfurt (Main) Hauptbahnhof/Fernbusterminal",
            50.1051,
            8.662113,
            surfaceProducts,
            ["Bus 37", "Bus 64"]
        ),
        createStop(
            "3007011",
            "Frankfurt (Main) Hauptbahnhof Südseite",
            50.10572,
            8.664055,
            surfaceProducts,
            ["Tram 16", "Bus 64"]
        ),
        createStop(
            "3000010",
            "Frankfurt Hbf",
            50.107158,
            8.663767,
            {
                express: true,
                regional: true,
                suburban: true,
                subway: true,
                tram: true,
                bus: true
            },
            ["ICE", "RE55", "S8", "U4", "Tram 17", "Bus 64"]
        )
    ]);

    assert.equal(stations.length, 1);
    assert.equal(stations[0].id, "3000010");
    assert.equal(stations[0].name, "Frankfurt Hbf");
    assert.deepEqual(stations[0].coordinates, [50.107158, 8.663767]);
    assert.deepEqual(
        stations[0].stops.map(stop => stop.id),
        ["3000008", "3060865", "3007011", "3000010"]
    );
    assert.deepEqual(
        stations[0].lines,
        ["Bus 37", "Bus 64", "Bus N4", "ICE", "RE55", "S8", "Tram 16", "Tram 17", "U4"]
    );
    assert.equal(getDisplayStationName(stations[0]), "Frankfurt Hbf");
    assert.equal(getSearchStationName(stations[0]), "Hauptbahnhof Frankfurt Hbf");
    assert.equal(
        getSearchStationName(stations[0]).toLowerCase().includes("hauptbahnhof"),
        true
    );
});

test("gives ordinary grouped stations a representative route-planner id", () => {
    const stations = prepareStations([
        createStop(
            "stop-first",
            "S Galluswarte",
            50.1039,
            8.6444,
            { suburban: true },
            ["S3"]
        ),
        createStop(
            "stop-platform",
            "Galluswarte Bf",
            50.1038,
            8.6445,
            { bus: true },
            ["Bus 52"]
        )
    ]);

    assert.equal(stations.length, 1);
    assert.equal(stations[0].id, "stop-first");
    assert.deepEqual(
        stations[0].stops.map(stop => stop.id),
        ["stop-first", "stop-platform"]
    );
});
