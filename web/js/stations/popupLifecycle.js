export function waitForPopupElement(marker) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(marker.getPopup()?.getElement() ?? null);
        }, 0);
    });
}
