import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = {
    location: {
        hostname: "hannover.transitradar.de",
        protocol: "https:",
        search: ""
    }
};

globalThis.localStorage = {
    getItem() {
        return null;
    },
    setItem() {}
};

const { getBadgeStyle } = await import("../js/lines/lineColors.js");
const { getStationLinesHtml } = await import("../js/stations/stationPopup.js");

test("uses the official ÜSTRA corridor colors for Stadtbahn lines", () => {
    assert.equal(getBadgeStyle("3").background, "#0072BC");
    assert.equal(getBadgeStyle("1").background, "#EF3E22");
    assert.equal(getBadgeStyle("5").background, "#F9A51B");
    assert.equal(getBadgeStyle("10").background, "#71BF44");
});

test("uses the ÜSTRA network-map grey for regional and S-Bahn lines", () => {
    assert.equal(getBadgeStyle("S5").background, "#808285");
    assert.equal(getBadgeStyle("RE8").background, "#808285");
    assert.equal(getBadgeStyle("RB38").background, "#808285");
});

test("does not color Hannover bus lines like Stadtbahn lines", () => {
    assert.equal(getBadgeStyle("100").background, "#fff");
    assert.equal(getBadgeStyle("500").background, "#fff");
});

test("shows Hannover Stadtbahn lines before regional rail in station popups", () => {
    const html = getStationLinesHtml({
        lines: ["S1", "RE1", "1"]
    });

    assert.ok(html.indexOf("#EF3E22") < html.indexOf("#808285"));
});
