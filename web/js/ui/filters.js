import { CITY_CONFIG } from "../config.js";

export const activeFilters = {
    stations: {
        suburban: true,
        subway: true,
        surface: true,
        regional: true,
        longDistance: true
    },

    vehicles: {
        suburban: true,
        subway: true,
        surface: true,
        regional: true,
        longDistance: true
    }
};

export function setupFilters(onFilterChange) {
    const filterToggle = document.getElementById("filterToggle");
    const filterPanel = document.getElementById("filterPanel");
    const filterOptions = document.querySelectorAll(".filter-option");
    const vehicleFilterSection = document.querySelector('[data-filter-section="vehicles"]');

    if (!CITY_CONFIG.supportsLiveVehicles) {
        vehicleFilterSection?.remove();
    }

    if (!filterToggle || !filterPanel) {
        return;
    }

    filterToggle.setAttribute("aria-controls", filterPanel.id);
    filterToggle.setAttribute("aria-expanded", "false");
    filterPanel.setAttribute("aria-hidden", "true");
    filterPanel.inert = true;

    function setPanelOpen(isOpen, { restoreFocus = false } = {}) {
        filterPanel.classList.toggle("open", isOpen);
        filterPanel.setAttribute("aria-hidden", String(!isOpen));
        filterPanel.inert = !isOpen;
        filterToggle.setAttribute("aria-expanded", String(isOpen));

        if (restoreFocus) {
            filterToggle.focus();
        }
    }

    filterToggle.addEventListener("click", event => {
        event.stopPropagation();
        setPanelOpen(!filterPanel.classList.contains("open"));
    });

    filterPanel.addEventListener("click", event => {
        event.stopPropagation();
    });

    document.addEventListener("click", () => {
        setPanelOpen(false);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && filterPanel.classList.contains("open")) {
            setPanelOpen(false, { restoreFocus: true });
        }
    });

    filterOptions.forEach(option => {
        option.addEventListener("click", () => {
            const filterGroup = option.dataset.filterGroup;
            const filterName = option.dataset.filter;

            if (!activeFilters[filterGroup]) return;
            if (activeFilters[filterGroup][filterName] === undefined) return;

            activeFilters[filterGroup][filterName] =
                !activeFilters[filterGroup][filterName];

            option.classList.toggle(
                "active",
                activeFilters[filterGroup][filterName]
            );

            onFilterChange();
        });
    });
}
