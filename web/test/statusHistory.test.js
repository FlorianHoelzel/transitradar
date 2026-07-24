import assert from "node:assert/strict";
import test from "node:test";

import {
    loadStatusHistory,
    saveStatusHistory,
    STATUS_HISTORY_KEY
} from "../js/statusHistory.js";

function createStorage(initialValue = null) {
    let value = initialValue;

    return {
        getItem(key) {
            return key === STATUS_HISTORY_KEY ? value : null;
        },
        setItem(key, nextValue) {
            if (key === STATUS_HISTORY_KEY) {
                value = nextValue;
            }
        }
    };
}

test("restores up to twelve recent latency samples", () => {
    const now = Date.UTC(2026, 6, 24, 14);
    const storage = createStorage(JSON.stringify({
        savedAt: now - 1000,
        providers: {
            vbb: Array.from({ length: 15 }, (_, index) => index * 10),
            hvv: [120, null, 180]
        }
    }));
    const history = loadStatusHistory(storage, now);

    assert.deepEqual(history.vbb, [
        30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140
    ]);
    assert.deepEqual(history.hvv, [120, null, 180]);
});

test("ignores stale or malformed cached histories", () => {
    const now = Date.UTC(2026, 6, 24, 14);
    const staleStorage = createStorage(JSON.stringify({
        savedAt: now - 25 * 60 * 60 * 1000,
        providers: { vbb: [120] }
    }));
    const malformedStorage = createStorage("{not-json");

    assert.deepEqual(loadStatusHistory(staleStorage, now), {});
    assert.deepEqual(loadStatusHistory(malformedStorage, now), {});
});

test("saves normalized provider histories without breaking unavailable storage", () => {
    const now = Date.UTC(2026, 6, 24, 14);
    const storage = createStorage();

    saveStatusHistory(storage, [
        {
            id: "vbb",
            latencyHistory: [120, -1, 180, Number.POSITIVE_INFINITY, null]
        }
    ], now);

    assert.deepEqual(loadStatusHistory(storage, now), {
        vbb: [120, 180, null]
    });
    assert.doesNotThrow(() => {
        saveStatusHistory({
            setItem() {
                throw new Error("blocked");
            }
        }, []);
    });
});
