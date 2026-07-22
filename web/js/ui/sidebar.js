import {
    startFavoritesRefresh,
    stopFavoritesRefresh,
    renderFavorites
} from "../favorites/favoriteController.js";
import { map } from "../map/map.js";
import { createLineBadge } from "../lines/badges.js";
import { loadDeparturesForStation } from "../stations/departureService.js";
import { getStations } from "../stations/stationStore.js";
import { markers, updateVisibleMarkers } from "../stations/stationMarkers.js";
import { CITY_CONFIG } from "../config.js";
import { formatCompactDepartureTime } from "../settings/departureTime.js";

const NEARBY_STATION_LIMIT = 8;
const NEARBY_DEPARTURE_LIMIT = 5;
const NEARBY_REFRESH_INTERVAL = 15000;

function calculateDistanceMeters(origin, destination) {
    const earthRadiusMeters = 6371000;
    const toRadians = value => value * Math.PI / 180;

    const [originLat, originLng] = origin;
    const [destinationLat, destinationLng] = destination;

    const latDistance = toRadians(destinationLat - originLat);
    const lngDistance = toRadians(destinationLng - originLng);

    const a =
        Math.sin(latDistance / 2) ** 2 +
        Math.cos(toRadians(originLat)) *
            Math.cos(toRadians(destinationLat)) *
            Math.sin(lngDistance / 2) ** 2;

    return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceMeters) {
    if (distanceMeters < 1000) {
        return `${Math.round(distanceMeters / 10) * 10} m`;
    }

    return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function getDelayText(departure) {
    if (!departure.delay || departure.delay <= 0) {
        return "";
    }

    return `+${Math.round(departure.delay / 60)}`;
}

function getNearbyStations(userPosition) {
    return getStations()
        .filter(station => Array.isArray(station.coordinates))
        .map(station => ({
            station,
            distance: calculateDistanceMeters(userPosition, station.coordinates)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, NEARBY_STATION_LIMIT);
}

function openStationOnMap(station) {
    if (!station?.coordinates) {
        return;
    }

    map.flyTo(station.coordinates, 16, {
        duration: 0.3
    });

    map.once("moveend", () => {
        updateVisibleMarkers(getStations());

        setTimeout(() => {
            const marker = markers[station.name];

            if (marker) {
                marker.openPopup();
            }
        }, 100);
    });
}

function createNearbyDepartureHtml(departure) {
    const lineName = departure.line?.name || "";
    const direction = departure.direction || "Richtung unbekannt";
    const time = formatCompactDepartureTime(departure.when || departure.plannedWhen);
    const delayText = getDelayText(departure);

    return `
        <div class="favorite-departure">
            <div class="favorite-departure-main">
                <div class="favorite-departure-line">
                    ${createLineBadge(lineName)}
                    <span class="favorite-departure-direction">${direction}</span>
                </div>

                <div class="favorite-departure-time-group">
                    <span class="favorite-departure-time">${time}</span>
                    ${delayText ? `<span class="favorite-departure-delay">${delayText}</span>` : ""}
                </div>
            </div>
        </div>
    `;
}

function createNearbyStationHtml(station, distance, departures = [], index) {
    const departuresHtml = departures.length > 0
        ? departures
            .slice(0, NEARBY_DEPARTURE_LIMIT)
            .map(createNearbyDepartureHtml)
            .join("")
        : `<div class="favorite-empty">Keine Abfahrten gefunden.</div>`;

    return `
        <article class="favorite-card nearby-card" data-nearby-index="${index}">
            <div class="favorite-card-header nearby-card-header">
                <button class="favorite-open nearby-open" type="button" title="Haltestelle öffnen">
                    <span class="favorite-station-name">${station.name}</span>
                </button>

                <span class="nearby-distance">${formatDistance(distance)}</span>
            </div>

            <div class="favorite-departures">
                ${departuresHtml}
            </div>
        </article>
    `;
}

export function setupSidebar() {
    const officialSourcesHtml = CITY_CONFIG.officialSources
        .map(source => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a>`)
        .join(", ");
    const sidebarToggle = document.createElement("button");
    sidebarToggle.id = "sidebarToggle";
    sidebarToggle.className = "sidebar-toggle liquid-button";
    sidebarToggle.type = "button";
    sidebarToggle.innerHTML = "☰";

    const sidebarOverlay = document.createElement("div");
    sidebarOverlay.id = "sidebarOverlay";
    sidebarOverlay.className = "sidebar-overlay";

    const sidebar = document.createElement("aside");
    sidebar.id = "sidebar";
    sidebar.className = "sidebar liquid-glass";

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <div>
                <div class="sidebar-kicker">TransitRadar</div>
                <h2>Menu</h2>
            </div>

            <button id="sidebarClose" class="sidebar-close liquid-button" type="button">
                ×
            </button>
        </div>

        <div id="sidebarContent" class="sidebar-content">
            <nav class="sidebar-nav">
                <button id="routePlannerButton" class="sidebar-item sidebar-route-planner" type="button">
                    <span class="sidebar-item-emoji">🧭</span>
                    <span>Route planen</span>
                </button>

                <button id="nearbyButton" class="sidebar-item" type="button">
                    <span class="sidebar-item-emoji">📍</span>
                    <span>Haltestellen in der Nähe</span>
                    <span id="nearbyChevron" class="sidebar-chevron">⌄</span>
                </button>

                <section id="nearbyPanel" class="nearby-panel">
                    <div class="nearby-panel-header">
                        <h3>In der Nähe</h3>
                        <span>Haltestellen rund um deinen Standort</span>
                    </div>

                    <div id="nearbyList" class="nearby-list">
                        <div class="nearby-empty">
                            Tippe auf den Standort-Button, um Haltestellen in der Nähe anzuzeigen.
                        </div>
                    </div>
                </section>

                <button id="favoritesButton" class="sidebar-item" type="button">
                    <span class="sidebar-item-emoji">⭐</span>
                    <span>Favoriten</span>
                    <span id="favoritesChevron" class="sidebar-chevron">⌄</span>
                </button>

                <section id="favoritesPanel" class="favorites-panel">
                    <div class="favorites-panel-header">
                        <h3>Favoriten</h3>
                        <span>Aktuelle Abfahrten</span>
                    </div>

                    <div id="favoritesListWrapper" class="favorites-list-wrapper">
                        <div id="favoritesList" class="favorites-list"></div>
                    </div>
                </section>
            </nav>
        </div>

        <div class="sidebar-footer">
            <button id="settingsButton" class="sidebar-item sidebar-settings" type="button">
                <span class="sidebar-item-emoji">⚙️</span>
                <span>Einstellungen</span>
            </button>

            <button id="aboutButton" class="sidebar-item sidebar-about" type="button">
                <span class="sidebar-item-emoji">ℹ️</span>
                <span>Über TransitRadar</span>
            </button>
        </div>
    `;

    const aboutOverlay = document.createElement("div");
    aboutOverlay.id = "aboutOverlay";
    aboutOverlay.className = "about-overlay";

    const featureSummary = CITY_CONFIG.supportsLiveVehicles
        ? "Haltestellen in der Nähe, aktuelle Abfahrten, Live-Fahrzeugpositionen, hervorgehobene Linien und ausgewählte Fahrzeugrouten"
        : "Haltestellen in der Nähe, aktuelle Abfahrten, hervorgehobene Linien und Fahrtverläufe";
    const sourceSummary = CITY_CONFIG.supportsLiveVehicles
        ? "Haltestellendaten, Abfahrten, Fahrtdetails und Live-Fahrzeugpositionen können aus unterschiedlichen Schnittstellen stammen und in verschiedenen Abständen aktualisiert werden."
        : "Haltestellendaten, aktuelle Abfahrten und Fahrtdetails können in verschiedenen Abständen aktualisiert werden.";
    const vehicleDisclaimer = CITY_CONFIG.supportsLiveVehicles
        ? `
                    <p>
                        Live-Fahrzeugpositionen sind Schätzungen auf Grundlage öffentlich zugänglicher API-Daten.
                        Sie können verspätet, vorübergehend nicht verfügbar oder aufgrund technischer Einschränkungen ungenau sein.
                    </p>
        `
        : "";

    aboutOverlay.innerHTML = `
        <section class="about-panel">
            <div class="about-header">
                <div>
                    <div class="about-kicker">Über</div>
                    <h2>TransitRadar ${CITY_CONFIG.name}</h2>
                </div>

                <button id="aboutClose" class="about-close" type="button">×</button>
            </div>

            <div class="about-content">
                <p>
                    <strong>TransitRadar ${CITY_CONFIG.name}</strong> ist ein persönliches Webprojekt zur Erkundung des öffentlichen Nahverkehrs in ${CITY_CONFIG.name}.
                    Die App zeigt ${featureSummary} auf einer interaktiven Karte.
                </p>

                <div class="about-card">
                    <h3>🛰️ Datenquellen</h3>
                    <p>
                        TransitRadar ${CITY_CONFIG.name} verwendet ${CITY_CONFIG.dataSourceText}.
                        ${sourceSummary}
                    </p>
                </div>

                <div class="about-card warning">
                    <h3>⚠️ Wichtiger Hinweis</h3>
                    <p>Alle Angaben sind ohne Gewähr.</p>
                    ${vehicleDisclaimer}
                    <p>
                        Abfahrten, Verspätungen, Ziele, Routen und Haltestelleninformationen können sich jederzeit ändern
                        und sind nicht rechtsverbindlich.
                    </p>
                    <p>
                        TransitRadar ${CITY_CONFIG.name} ist ein unabhängiges Projekt und steht
                        <strong>in keiner Verbindung zu ${CITY_CONFIG.affiliationText}.</strong>
                    </p>
                    <p>
                        Für offizielle und aktuelle Reiseinformationen nutze bitte immer
                        ${officialSourcesHtml} oder die offiziellen Angebote des ${CITY_CONFIG.network}.
                    </p>
                </div>

                <a class="about-privacy-link" href="/datenschutz">
                    <span aria-hidden="true">🔒</span>
                    <span>Datenschutz</span>
                </a>
            </div>
        </section>
    `;

    document.body.append(sidebarToggle, sidebarOverlay, sidebar, aboutOverlay);

    const sidebarClose = document.getElementById("sidebarClose");
    const sidebarContent = document.getElementById("sidebarContent");

    const nearbyButton = document.getElementById("nearbyButton");
    const nearbyPanel = document.getElementById("nearbyPanel");
    const nearbyChevron = document.getElementById("nearbyChevron");
    const nearbyList = document.getElementById("nearbyList");

    const favoritesButton = document.getElementById("favoritesButton");
    const routePlannerButton = document.getElementById("routePlannerButton");
    const favoritesPanel = document.getElementById("favoritesPanel");
    const favoritesChevron = document.getElementById("favoritesChevron");

    const favoritesList = document.getElementById("favoritesList");
    const favoritesListWrapper = document.getElementById("favoritesListWrapper");

    const aboutButton = document.getElementById("aboutButton");
    const aboutClose = document.getElementById("aboutClose");

    let lastUserPosition = null;
    let nearbyRefreshInterval = null;
    let nearbyRenderId = 0;

    function updateFooterFade() {
        const canScroll = sidebarContent.scrollHeight > sidebarContent.clientHeight;
        const atBottom =
            sidebarContent.scrollTop + sidebarContent.clientHeight >=
            sidebarContent.scrollHeight - 2;

        sidebar.classList.toggle("has-footer-fade", canScroll && !atBottom);
    }

    function setNearbyMessage(message) {
        nearbyList.innerHTML = `
            <div class="nearby-empty">
                ${message}
            </div>
        `;
    }

    function setupNearbyActions(nearbyStations) {
        const nearbyCards = nearbyList.querySelectorAll(".nearby-card");

        nearbyCards.forEach(card => {
            const nearbyStation = nearbyStations[Number(card.dataset.nearbyIndex)];

            if (!nearbyStation) {
                return;
            }

            card.addEventListener("click", () => {
                openStationOnMap(nearbyStation.station);
            });

            card.querySelector(".nearby-open")?.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();

                openStationOnMap(nearbyStation.station);
            });
        });
    }

    async function renderNearbyStation({ station, distance }, index) {
        try {
            const departures = await loadDeparturesForStation(station);

            return createNearbyStationHtml(station, distance, departures, index);
        } catch (error) {
            console.error(`Abfahrten für ${station.name} konnten nicht geladen werden:`, error);
            return createNearbyStationHtml(station, distance, [], index);
        }
    }

    async function renderNearbyStations() {
        if (!lastUserPosition) {
            setNearbyMessage("Nutze den Standort-Button, um Haltestellen in der Nähe anzuzeigen.");
            return;
        }

        if (getStations().length === 0) {
            setNearbyMessage("Haltestellen in der Nähe werden geladen …");
            return;
        }

        const renderId = ++nearbyRenderId;
        const nearbyStations = getNearbyStations(lastUserPosition);

        if (nearbyStations.length === 0) {
            setNearbyMessage("Keine Haltestellen in der Nähe gefunden.");
            return;
        }

        if (nearbyList.querySelectorAll(".nearby-card").length === 0) {
            setNearbyMessage("Abfahrten in der Nähe werden geladen …");
        }

        const nearbyCards = await Promise.all(
            nearbyStations.map(renderNearbyStation)
        );

        if (renderId !== nearbyRenderId) {
            return;
        }

        nearbyList.innerHTML = nearbyCards.join("");
        setupNearbyActions(nearbyStations);
        requestAnimationFrame(updateFooterFade);
    }

    function startNearbyRefresh() {
        if (nearbyRefreshInterval) {
            return;
        }

        nearbyRefreshInterval = setInterval(() => {
            renderNearbyStations();
        }, NEARBY_REFRESH_INTERVAL);
    }

    function stopNearbyRefresh() {
        if (!nearbyRefreshInterval) {
            return;
        }

        clearInterval(nearbyRefreshInterval);
        nearbyRefreshInterval = null;
    }

    function updateFavoritesFade() {
        if (!favoritesList || !favoritesListWrapper) {
            return;
        }

        const canScroll = favoritesList.scrollHeight > favoritesList.clientHeight;
        const atBottom =
            favoritesList.scrollTop + favoritesList.clientHeight >=
            favoritesList.scrollHeight - 2;

        favoritesList.classList.toggle("has-fade", canScroll && !atBottom);
    }

    function openSidebar() {
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("open");
        sidebarToggle.classList.add("hidden");
        requestAnimationFrame(updateFooterFade);
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("open");
        sidebarToggle.classList.remove("hidden");
        sidebar.classList.remove("has-footer-fade");
    }

    function toggleNearby() {
        const isOpen = nearbyPanel.classList.toggle("open");

        nearbyButton.classList.toggle("active", isOpen);
        nearbyChevron.classList.toggle("open", isOpen);

        if (isOpen) {
            renderNearbyStations();
            startNearbyRefresh();
            sidebar.classList.add("has-footer-fade");

            if (!lastUserPosition) {
                document.getElementById("locationButton")?.click();
            }
        } else {
            stopNearbyRefresh();
        }

        requestAnimationFrame(updateFooterFade);
    }

    async function toggleFavorites() {
        const isOpen = favoritesPanel.classList.toggle("open");

        favoritesButton.classList.toggle("active", isOpen);
        favoritesChevron.classList.toggle("open", isOpen);

        if (!isOpen) {
            favoritesList.classList.remove("has-fade");
            stopFavoritesRefresh();
            requestAnimationFrame(updateFooterFade);
            return;
        }

        await renderFavorites();
        updateFavoritesFade();
        startFavoritesRefresh();
        sidebar.classList.add("has-footer-fade");

        setTimeout(updateFavoritesFade, 50);
        setTimeout(updateFooterFade, 50);
    }

    function openAbout() {
        aboutOverlay.classList.add("open");
    }

    function closeAbout() {
        aboutOverlay.classList.remove("open");
    }

    sidebarToggle.addEventListener("click", openSidebar);
    sidebarClose.addEventListener("click", closeSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);

    nearbyButton.addEventListener("click", toggleNearby);
    favoritesButton.addEventListener("click", toggleFavorites);
    routePlannerButton.addEventListener("click", () => {
        closeSidebar();
        window.dispatchEvent(new CustomEvent("routePlanner:open"));
    });

    favoritesList?.addEventListener("scroll", updateFavoritesFade);
    sidebarContent.addEventListener("scroll", updateFooterFade);

    window.addEventListener("favoritesChanged", () => {
        setTimeout(updateFavoritesFade, 50);
        setTimeout(updateFooterFade, 50);
    });

    window.addEventListener("userLocationUpdated", event => {
        const { latitude, longitude } = event.detail;

        lastUserPosition = [latitude, longitude];

        if (nearbyPanel.classList.contains("open")) {
            renderNearbyStations();
        }
    });

    window.addEventListener("userLocationError", () => {
        if (nearbyPanel.classList.contains("open")) {
            setNearbyMessage("Dein Standort konnte nicht abgerufen werden.");
        }
    });

    window.addEventListener("stationsUpdated", () => {
        if (nearbyPanel.classList.contains("open")) {
            renderNearbyStations();
        }
    });

    window.addEventListener("transitRadarSettingsChanged", () => {
        if (nearbyPanel.classList.contains("open")) {
            renderNearbyStations();
        }

        if (favoritesPanel.classList.contains("open")) {
            renderFavorites();
        }
    });

    aboutButton.addEventListener("click", openAbout);
    aboutClose.addEventListener("click", closeAbout);

    aboutOverlay.addEventListener("click", event => {
        if (event.target === aboutOverlay) {
            closeAbout();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
            closeAbout();
        }
    });
}
