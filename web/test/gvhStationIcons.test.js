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

globalThis.localStorage = {
    getItem() {
        return null;
    },
    setItem() {}
};

const { getStationIcon } = await import("../js/stations/stationIcons.js");
const {
    isImportantTrainStation,
    shouldShowStation
} = await import("../js/stations/stationUtils.js");

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

test("uses Berlin-style zoom tiers for Hannover stations", () => {
    const importantInterchange = station({
        suburban: true,
        regional: true
    });
    const suburbanStop = station({ suburban: true });
    const stadtbahnStop = station({ tram: true });
    const busStop = station({ bus: true });

    assert.equal(isImportantTrainStation(importantInterchange), true);
    assert.equal(isImportantTrainStation(suburbanStop), true);
    assert.equal(isImportantTrainStation(stadtbahnStop), true);

    assert.equal(shouldShowStation(importantInterchange, 12), true);
    assert.equal(shouldShowStation(suburbanStop, 12), true);
    assert.equal(shouldShowStation(stadtbahnStop, 12), true);
    assert.equal(shouldShowStation(busStop, 12), false);

    assert.equal(shouldShowStation(suburbanStop, 13), true);
    assert.equal(shouldShowStation(stadtbahnStop, 13), true);
    assert.equal(shouldShowStation(busStop, 14), false);
    assert.equal(shouldShowStation(busStop, 15), true);
});
