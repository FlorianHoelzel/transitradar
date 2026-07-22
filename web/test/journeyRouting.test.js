import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = {
    location: {
        hostname: "hamburg.transitradar.de",
        protocol: "https:",
        search: ""
    }
};

const requestedUrls = [];
let responseForUrl = () => ({ journeys: [{ id: "journey-1", legs: [] }] });

globalThis.fetch = async url => {
    requestedUrls.push(String(url));

    return {
        ok: true,
        async json() {
            return responseForUrl(new URL(String(url)));
        }
    };
};

const { getJourneys, getStationServingLines } = await import("../js/api/transitApi.js");

test("routes grouped stations through their strongest member stop", async () => {
    requestedUrls.length = 0;
    responseForUrl = () => ({ journeys: [{ id: "journey-1", legs: [] }] });

    const journeys = await getJourneys({
        from: {
            id: "Master:42011",
            products: { bus: true },
            lines: ["43"]
        },
        to: {
            id: "Master:10002",
            products: { bus: true },
            lines: ["2", "3"],
            stops: [
                {
                    id: "Master:10002",
                    products: { bus: true },
                    lines: ["2", "3"]
                },
                {
                    id: "Master:9910950",
                    products: {
                        express: true,
                        regional: true,
                        suburban: true,
                        subway: true,
                        bus: true
                    },
                    lines: ["RE8", "S1", "U1", "2"]
                }
            ]
        },
        departure: "2026-07-22T20:32:00.000Z"
    });

    assert.equal(journeys.length, 1);
    assert.equal(requestedUrls.length, 1);

    const request = new URL(requestedUrls[0]);
    assert.equal(request.searchParams.get("from"), "Master:42011");
    assert.equal(request.searchParams.get("to"), "Master:9910950");
});

test("falls back to another member stop when the preferred stop has no journeys", async () => {
    requestedUrls.length = 0;
    responseForUrl = url => {
        return url.searchParams.get("to") === "Master:10002"
            ? { journeys: [{ id: "journey-zob", legs: [] }] }
            : { journeys: [] };
    };

    const journeys = await getJourneys({
        from: {
            id: "Master:42011",
            products: { bus: true },
            lines: ["43"]
        },
        to: {
            id: "Master:9910950",
            products: {
                express: true,
                regional: true,
                suburban: true,
                subway: true,
                bus: true
            },
            stops: [
                {
                    id: "Master:9910950",
                    products: { express: true, regional: true },
                    lines: ["RE8"]
                },
                {
                    id: "Master:10002",
                    products: { bus: true },
                    lines: ["2", "3"]
                }
            ]
        }
    });

    assert.equal(journeys[0].id, "journey-zob");
    assert.equal(requestedUrls.length, 2);
    assert.deepEqual(
        requestedUrls.map(url => new URL(url).searchParams.get("to")),
        ["Master:9910950", "Master:10002"]
    );
});

test("preserves the numeric stop IDs used by Berlin and Frankfurt", async () => {
    requestedUrls.length = 0;
    responseForUrl = () => ({ journeys: [{ id: "numeric-journey", legs: [] }] });

    await getJourneys({
        from: { id: "900100003", products: { suburban: true } },
        to: { id: "900003201", products: { express: true } }
    });
    await getJourneys({
        from: { id: "3000001", products: { suburban: true } },
        to: { id: "3000010", products: { express: true } }
    });

    assert.deepEqual(
        requestedUrls.map(url => {
            const request = new URL(url);
            return [request.searchParams.get("from"), request.searchParams.get("to")];
        }),
        [
            ["900100003", "900003201"],
            ["3000001", "3000010"]
        ]
    );
});

test("discovers missing S-Bahn and U-Bahn lines from live departures", async () => {
    requestedUrls.length = 0;
    responseForUrl = () => ({
        departures: [
            { line: { name: "3", product: "bus" } },
            { line: { name: "S1", product: "suburban" } },
            { line: { name: "S3", product: "suburban" } },
            { line: { name: "U1", product: "subway" } },
            { line: { name: "S1", product: "suburban" } }
        ]
    });

    const lines = await getStationServingLines({ id: "Master:9910950" });

    assert.deepEqual(lines.map(line => line.name), ["3", "S1", "S3", "U1"]);
    assert.match(requestedUrls[0], /\/stops\/Master:9910950\/departures/u);
});
