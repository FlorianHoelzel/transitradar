import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

process.env.GEOFOX_USER = "test-user";
process.env.GEOFOX_PASSWORD = "test-password";

const { createSignature } = await import("../src/geofoxClient.js");

test("signs the exact UTF-8 request body with HMAC-SHA1", () => {
    const body = JSON.stringify({ language: "de", version: 63 });
    const expected = createHmac("sha1", "secret")
        .update(body, "utf8")
        .digest("base64");

    assert.equal(createSignature(body, "secret"), expected);
});
