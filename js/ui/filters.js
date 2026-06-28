export const activeFilters = {
    stations: {
        suburban: true,
        subway: true,
        surface: true
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

    if (!filterToggle || !filterPanel) {
        return;
    }

    filterToggle.addEventListener("click", event => {
        event.stopPropagation();
        filterPanel.classList.toggle("open");
    });

    filterPanel.addEventListener("click", event => {
        event.stopPropagation();
    });

    document.addEventListener("click", () => {
        filterPanel.classList.remove("open");
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