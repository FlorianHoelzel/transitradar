import assert from "node:assert/strict";
import test from "node:test";

import { setupVehiclePopupLifecycle } from "../js/vehicles/vehiclePopupLifecycle.js";

function createMarker(popup) {
    const handlers = new Map();

    return {
        popupOpen: true,
        on(eventName, handler) {
            handlers.set(eventName, handler);
        },
        fire(eventName) {
            handlers.get(eventName)?.({ popup });
        },
        getPopup() {
            return popup;
        },
        isPopupOpen() {
            return this.popupOpen;
        }
    };
}

test("disables repeated auto-pan after the popup's initial positioning", () => {
    const popup = { options: { autoPan: true } };
    const marker = createMarker(popup);
    let scheduledCallback = null;

    setupVehiclePopupLifecycle(marker, callback => {
        scheduledCallback = callback;
    });
    marker.fire("popupopen");

    assert.equal(popup.options.autoPan, true);
    scheduledCallback();
    assert.equal(popup.options.autoPan, false);
});

test("restores auto-pan before the popup is opened again", () => {
    const popup = { options: { autoPan: false } };
    const marker = createMarker(popup);

    setupVehiclePopupLifecycle(marker, () => {});
    marker.popupOpen = false;
    marker.fire("popupclose");

    assert.equal(popup.options.autoPan, true);
});

test("does not change a popup that closed before the next frame", () => {
    const popup = { options: { autoPan: true } };
    const marker = createMarker(popup);
    let scheduledCallback = null;

    setupVehiclePopupLifecycle(marker, callback => {
        scheduledCallback = callback;
    });
    marker.fire("popupopen");
    marker.popupOpen = false;
    scheduledCallback();

    assert.equal(popup.options.autoPan, true);
});
