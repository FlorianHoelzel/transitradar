import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = {
    location: {
        hostname: "hannover.transitradar.de",
        protocol: "https:",
        search: ""
    }
};

globalThis.L = {
    divIcon(options) {
        return options;
    }
};

const { getStationIcon } = await import("../js/stations/stationIcons.js");

function station(products) {
    return {
        name: "Teststation",
        products,
        lines: []
    };
}

test("uses the blue Stadtbahn marker for Hannover tram stops", () => {
    assert.match(
        getStationIcon(station({ tram: true })).className,
        /subway-marker/u
    );
});

test("uses rail and bus marker colors for the remaining GVH modes", () => {
    assert.match(
        getStationIcon(station({ suburban: true })).className,
        /suburban-marker/u
    );
    assert.match(
        getStationIcon(station({ regional: true })).className,
        /suburban-marker/u
    );
    assert.match(
        getStationIcon(station({ bus: true })).className,
        /bus-marker/u
    );
});
