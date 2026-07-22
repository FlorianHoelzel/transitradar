let isOpen = false;

export function setupRoutePlanner() {
    const toggle = document.getElementById("routePlannerToggle");
    const controls = document.getElementById("topSearchControls");
    const panel = document.getElementById("routePlannerPanel");
    const closeButton = document.getElementById("routePlannerClose");
    const searchRestore = document.getElementById("stationSearchRestore");
    const stationSearchInput = document.getElementById("searchInput");
    const swapButton = document.getElementById("routePlannerSwap");
    const originInput = document.getElementById("routePlannerOrigin");
    const destinationInput = document.getElementById("routePlannerDestination");

    if (!toggle || !panel) {
        return;
    }

    function setOpen(nextOpen, focusDestination = true) {
        isOpen = nextOpen;
        panel.classList.toggle("open", isOpen);
        controls.classList.toggle("route-mode", isOpen);
        toggle.classList.toggle("active", isOpen);
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.tabIndex = isOpen ? -1 : 0;
        panel.setAttribute("aria-hidden", String(!isOpen));
        panel.toggleAttribute("inert", !isOpen);
        searchRestore.tabIndex = isOpen ? 0 : -1;
        document.body.classList.toggle("route-planner-open", isOpen);

        if (isOpen && focusDestination) {
            window.requestAnimationFrame(() => destinationInput?.focus());
        } else if (!isOpen && panel.contains(document.activeElement)) {
            toggle.focus();
        }
    }

    toggle.addEventListener("click", () => setOpen(!isOpen));
    closeButton?.addEventListener("click", () => setOpen(false));
    searchRestore?.addEventListener("click", () => {
        setOpen(false, false);
        window.requestAnimationFrame(() => stationSearchInput?.focus());
    });

    swapButton?.addEventListener("click", () => {
        const origin = originInput.value;

        originInput.value = destinationInput.value;
        destinationInput.value = origin;
        destinationInput.focus();
    });

    window.addEventListener("routePlanner:open", () => setOpen(true));

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && isOpen) {
            setOpen(false);
        }
    });
}
