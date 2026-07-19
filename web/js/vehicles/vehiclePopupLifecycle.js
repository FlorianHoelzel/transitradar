export function setupVehiclePopupLifecycle(marker, scheduleFrame = requestAnimationFrame) {
    marker.on("popupopen", event => {
        const popup = event.popup;

        scheduleFrame(() => {
            if (marker.isPopupOpen() && marker.getPopup() === popup) {
                popup.options.autoPan = false;
            }
        });
    });

    marker.on("popupclose", event => {
        event.popup.options.autoPan = true;
    });
}
