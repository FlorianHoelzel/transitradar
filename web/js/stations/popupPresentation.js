export function setupFade(popupElement) {
    const departures = popupElement?.querySelector(".departures");
    if (!departures) return;

    const updateFade = () => {
        const canScroll = departures.scrollHeight > departures.clientHeight;
        const atBottom = departures.scrollTop + departures.clientHeight >= departures.scrollHeight - 2;
        departures.classList.toggle("has-fade", canScroll && !atBottom);
    };

    updateFade();
    departures.onscroll = updateFade;
}

export function setupStationLinesToggle(popupElement) {
    const linesContainer = popupElement?.querySelector(".station-lines");
    const toggleButton = linesContainer?.querySelector(".station-lines-toggle");
    if (!toggleButton) return;

    toggleButton.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        linesContainer.classList.add("expanded");
        toggleButton.remove();
    };
}
