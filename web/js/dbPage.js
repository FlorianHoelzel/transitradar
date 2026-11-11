import { map } from "./map/map.js";
import { clearRouteLayer } from "./map/routeLayer.js";
import { getSettings, updateSetting } from "./settings/settingsStore.js";
import { setupSettings } from "./settings/settingsController.js";
import { updateVisibleMarkers } from "./stations/stationMarkers.js";
import { setupSearch } from "./stations/stationSearch.js";
import { getStations, setStations } from "./stations/stationStore.js";
import { createApiStatusIndicator } from "./ui/apiStatusIndicator.js";
import { setupFilters } from "./ui/filters.js";
import { createLocationButton } from "./ui/locationButton.js";
import { setupRoutePlanner } from "./ui/routePlanner.js";
import { setupSidebar } from "./ui/sidebar.js";
import { initDbTrainLayer } from "./vehicles/dbTrainLayer.js?v=db-ui-1";

const mapStatus = document.getElementById("mapStatus");
let syncTrains = () => {};
let countryBounds;

function refreshStations() {
    updateVisibleMarkers(getStations());
}

function setupDbFilters() {
    const panel = document.getElementById("filterPanel");
    const stationOptions = panel.querySelectorAll('[data-filter-group="stations"]');
    stationOptions[0].dataset.filter = "longDistance";
    stationOptions[0].textContent = "ICE-Bahnhöfe";
    stationOptions[1].dataset.filter = "regional";
    stationOptions[1].textContent = "Regionalbahnhöfe";
    stationOptions[2].remove();

    panel.querySelectorAll('[data-filter-group="vehicles"]').forEach(option => {
        if (option.dataset.filter === "longDistance") option.textContent = "ICE";
        else if (option.dataset.filter === "regional") option.textContent = "Regionalzüge";
        else option.remove();
    });
    const vehicleSection = panel.querySelector('[data-filter-section="vehicles"]');
    const toggle = document.createElement("button");
    toggle.id = "dbTrainToggle";
    toggle.className = "filter-option";
    toggle.type = "button";
    toggle.textContent = "Züge anzeigen";
    vehicleSection.querySelector(".filter-panel-title").after(toggle);
    const trainStatus = document.createElement("p");
    trainStatus.id = "dbTrainStatus";
    trainStatus.className = "db-filter-status";
    trainStatus.setAttribute("role", "status");
    trainStatus.hidden = true;
    vehicleSection.append(trainStatus);

    const reset = document.createElement("button");
    reset.id = "resetMap";
    reset.className = "filter-option";
    reset.type = "button";
    reset.textContent = "Ganz Deutschland anzeigen";
    reset.disabled = true;
    reset.addEventListener("click", () => {
        clearRouteLayer();
        map.closePopup();
        map.fitBounds(countryBounds, { padding: [20, 24], animate: false });
        document.getElementById("filterToggle").click();
    });
    panel.append(reset);

    function syncToggle() {
        const shown = getSettings().showVehicles;
        toggle.classList.toggle("active", shown);
        toggle.setAttribute("aria-pressed", String(shown));
    }

    toggle.addEventListener("click", () => updateSetting("showVehicles", !getSettings().showVehicles));
    syncToggle();
    window.addEventListener("transitRadarSettingsChanged", ({ detail }) => {
        syncToggle();
        if (detail.changedKey === "stationDensity" || detail.changedKey === "reset") refreshStations();
        if (["showVehicles", "smoothVehicleMovement", "reset"].includes(detail.changedKey)) syncTrains();
    });
    setupFilters(() => {
        map.closePopup();
        refreshStations();
        syncTrains();
    });

    return trainStatus;
}

async function loadStations(trainStatus) {
    try {
        const response = await fetch("/data/db-stations.json");
        if (!response.ok) throw new Error("Station data: HTTP " + response.status);
        const { boundary, stations } = await response.json();
        const border = L.geoJSON(boundary, {
            interactive: false,
            style: { color: "#8b96ab", weight: 1, opacity: 0.65, fill: false }
        }).addTo(map);
        countryBounds = border.getBounds();
        map.fitBounds(countryBounds, { padding: [20, 24], animate: false });

        const stationData = stations.map(station => ({
            ...station,
            id: station.lat + "," + station.lon + ":" + station.name,
            coordinates: [station.lat, station.lon],
            products: { express: station.ice, regional: station.regionalLines > 0 }
        }));
        setStations(stationData);
        setupSearch(stationData);
        refreshStations();
        syncTrains = initDbTrainLayer(map, boundary, countryBounds, trainStatus);
        map.attributionControl.addAttribution(
            'Bahnhöfe (gefiltert): <a href="https://www.gtfs.de/de/feeds/">GTFS.de / DELFI e.V.</a> ' +
            '(<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>) · Grenzen: Natural Earth · ' +
            'Abfahrten und Züge: <a href="https://transitous.org/sources/">Transitous</a> · ' +
            '<a href="https://github.com/FlorianHoelzel/transitradar/issues">Kontakt</a>'
        );
        document.getElementById("resetMap").disabled = false;
        mapStatus.hidden = true;
    } catch (error) {
        console.error(error);
        mapStatus.textContent = "Die Bahnhöfe konnten nicht geladen werden. Lade die Seite erneut.";
    }
}

document.body.dataset.city = "db";
setupSidebar();
setupRoutePlanner();
setupSettings();
createLocationButton();
createApiStatusIndicator();
map.on("moveend", refreshStations);
void loadStations(setupDbFilters());
