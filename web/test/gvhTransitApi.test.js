import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = {
    location: {
        hostname: "hannover.transitradar.de",
        protocol: "https:",
        search: ""
    }
};

const requestedUrls = [];

globalThis.fetch = async url => {
    requestedUrls.push(String(url));

    return {
        ok: true,
        async json() {
            return {
                departures: [
                    { line: { name: "S4", product: "suburban" } }
                ]
            };
        }
    };
};

const { getStationServingLines } = await import("../js/api/transitApi.js");

test("preserves qualified GVH stop references in departure requests", async () => {
    const lines = await getStationServingLines({ id: "de:03241:31" });

    assert.deepEqual(lines.map(line => line.name), ["S4"]);
    assert.match(
        requestedUrls[0],
        /\/stops\/de:03241:31\/departures/u
    );
});
