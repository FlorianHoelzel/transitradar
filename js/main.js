import { createApiStatusIndicator } from "./ui/apiStatusIndicator.js";
import { loadStations } from "./stations/stationService.js";
import { setStations, getStations } from "./stations/stationStore.js";
import { map } from "./map/map.js";
import {
    updateVisibleMarkers,
    stopPopupRefresh
} from "./stations/stationMarkers.js";
import { setupSearch } from "./stations/stationSearch.js";
import { updateVehicles } from "./vehicles/vehicleController.js";
import { setupFilters } from "./ui/filters.js";
import { setupSidebar } from "./ui/sidebar.js";
import { createLocationButton } from "./ui/locationButton.js";
import { vehicleState } from "./vehicles/vehicleState.js";
import { initializeDeveloperMode } from "./dev/developerMode.js";

async function setupStations() {
    try {
        const stations = await loadStations();

        setStations(stations);
        updateVisibleMarkers(getStations());
        setupSearch(getStations());
    } catch (error) {
        console.error("Failed to load stations:", error);
    }
}

function setupUi() {
    setupSidebar();
    createLocationButton();

    setupFilters(() => {
        stopPopupRefresh();
        updateVisibleMarkers(getStations());
        updateVehicles(true);
    });
}

function setupMapEvents() {
    map.on("moveend", () => {
        updateVisibleMarkers(getStations());
        updateVehicles(true);
    });
}

function setupVehicleRefresh() {
    updateVehicles(true);

    setInterval(() => {
        updateVehicles();
    }, vehicleState.refreshInterval);
}

function initApp() {
    initializeDeveloperMode();

    setupUi();
    createApiStatusIndicator();
    setupMapEvents();
    setupVehicleRefresh();
    setupStations();
}

initApp();