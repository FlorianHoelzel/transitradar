import assert from "node:assert/strict";
import test from "node:test";

import { getDepartureStationId } from "../src/stationAliases.js";

test("maps Frankfurt Hauptbahnhof platform stops to the aggregate stop", () => {
    assert.equal(getDepartureStationId("3000008"), "3000010");
    assert.equal(getDepartureStationId("3060865"), "3000010");
    assert.equal(getDepartureStationId("3007011"), "3000010");
});

test("keeps unrelated departure stop IDs unchanged", () => {
    assert.equal(getDepartureStationId("3000912"), "3000912");
});
