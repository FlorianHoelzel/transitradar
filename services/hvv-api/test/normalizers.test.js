import assert from "node:assert/strict";
import test from "node:test";

import { normalizeProducts, normalizeStop } from "../src/normalizers.js";

test("normalizes Geofox station coordinates and products", () => {
    const stop = normalizeStop({
        id: "Master:80953",
        combinedName: "Hamburg, Altona",
        coordinate: { x: 9.93454, y: 53.552405 },
        vehicleTypes: ["S_BAHN", "REGIONALBUS"]
    });

    assert.equal(stop.id, "Master:80953");
    assert.equal(stop.location.latitude, 53.552405);
    assert.equal(stop.location.longitude, 9.93454);
    assert.equal(stop.products.suburban, true);
    assert.equal(stop.products.bus, true);
});

test("normalizes short Geofox service type names", () => {
    const products = normalizeProducts(["u", "s", "ship"]);

    assert.equal(products.subway, true);
    assert.equal(products.suburban, true);
    assert.equal(products.ferry, true);
});
