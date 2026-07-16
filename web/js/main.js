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
import { CITY_CONFIG } from "./config.js";
import { setupSettings } from "./settings/settingsController.js";

function applyCityMetadata() {
    if (document.title === "TransitRadar – Live-ÖPNV-Karte") {
        document.title = `TransitRadar ${CITY_CONFIG.name}`;
    }

    document.body.dataset.city = CITY_CONFIG.id;

    const summaryTitle = document.getElementById("citySummaryTitle");
    const summaryText = document.getElementById("citySummaryText");

    if (summaryTitle) {
        summaryTitle.textContent = `Live-ÖPNV-Karte ${CITY_CONFIG.name}`;
    }

    if (summaryText) {
        const liveVehicleText = CITY_CONFIG.supportsLiveVehicles
            ? "Live-Fahrzeuge, "
            : "";

        summaryText.textContent =
            `Entdecke ${liveVehicleText}Haltestellen, aktuelle Abfahrten und ` +
            `Verspätungen im ${CITY_CONFIG.network}-Netz auf einer interaktiven Karte.`;
    }

    document.querySelectorAll('[data-filter="surface"]').forEach(option => {
        option.textContent = CITY_CONFIG.surfaceTransitLabel;
    });

    document.querySelector("header")?.setAttribute(
        "aria-label",
        `TransitRadar ${CITY_CONFIG.name}`
    );
    document.querySelector("main")?.setAttribute(
        "aria-label",
        `ÖPNV-Karte für ${CITY_CONFIG.name}`
    );
}

async function setupStations() {
    try {
        const stations = await loadStations();

        setStations(stations);
        updateVisibleMarkers(getStations());
        setupSearch(getStations());
    } catch (error) {
        console.error("Haltestellen konnten nicht geladen werden:", error);
    }
}

function setupUi() {
    setupSidebar();
    setupSettings();
    createLocationButton();

    setupFilters(() => {
        stopPopupRefresh();
        updateVisibleMarkers(getStations());

        if (CITY_CONFIG.supportsLiveVehicles) {
            updateVehicles(true);
        }
    });
}

function setupSettingsEvents() {
    window.addEventListener("transitRadarSettingsChanged", event => {
        const changedKey = event.detail?.changedKey;

        if (changedKey === "stationDensity" || changedKey === "departureTimeDisplay" || changedKey === "reset") {
            stopPopupRefresh();
            updateVisibleMarkers(getStations());
        }

        if (
            CITY_CONFIG.supportsLiveVehicles
            && (changedKey === "showVehicles" || changedKey === "reset")
        ) {
            updateVehicles(true);
        }
    });
}

function setupMapEvents() {
    map.on("moveend", () => {
        updateVisibleMarkers(getStations());

        if (CITY_CONFIG.supportsLiveVehicles) {
            updateVehicles(true);
        }
    });
}

function setupVehicleRefresh() {
    if (!CITY_CONFIG.supportsLiveVehicles) {
        return;
    }

    updateVehicles(true);

    setInterval(() => {
        updateVehicles();
    }, vehicleState.refreshInterval);
}

function initApp() {
    applyCityMetadata();
    setupUi();
    setupSettingsEvents();
    createApiStatusIndicator();
    setupMapEvents();
    setupVehicleRefresh();
    setupStations();
}

initApp();
