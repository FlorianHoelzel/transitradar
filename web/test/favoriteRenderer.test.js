import assert from "node:assert/strict";
import test from "node:test";

globalThis.localStorage = {
    getItem() {
        return JSON.stringify({
            departureTimeDisplay: "both"
        });
    }
};

globalThis.window = {
    location: {
        hostname: "berlin.transitradar.de",
        protocol: "https:",
        search: ""
    }
};

const { createFavoriteStationHtml } = await import(
    "../js/favorites/favoriteRenderer.js"
);

test("favorite departures show clock time without a countdown", () => {
    const html = createFavoriteStationHtml(
        {
            id: "station-1",
            name: "Test Station"
        },
        [{
            line: {
                name: "S2"
            },
            direction: "Test Direction",
            when: "2026-07-16T11:12:00+02:00"
        }]
    );

    assert.match(html, />\d{2}:\d{2}</);
    assert.doesNotMatch(html, /jetzt|in \d+ Min\./);
});
