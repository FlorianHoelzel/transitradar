import assert from "node:assert/strict";
import test from "node:test";

import { waitForPopupElement } from "../js/stations/popupLifecycle.js";

test("waits until after popupopen before reading the Leaflet popup element", async () => {
    const renderedElement = { id: "station-popup" };
    let popupElement = null;
    const marker = {
        getPopup() {
            return {
                getElement() {
                    return popupElement;
                }
            };
        }
    };

    const pendingElement = waitForPopupElement(marker);
    popupElement = renderedElement;

    assert.equal(await pendingElement, renderedElement);
});

test("returns null when the popup was removed before rendering", async () => {
    const marker = {
        getPopup() {
            return null;
        }
    };

    assert.equal(await waitForPopupElement(marker), null);
});
