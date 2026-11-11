import { addBaseTiles } from "./map/baseTiles.js";
import { bindDbStationPopup } from "./stations/dbStationPopup.js";

const status = document.getElementById("mapStatus");
const resetButton = document.getElementById("resetMap");

function renderStations(map, stations) {
    const layer = L.layerGroup().addTo(map);
    const markers = new Map();
    const regionalIcon = L.divIcon({
        className: "station-marker db-station-marker",
        iconSize: [20, 20],
        popupAnchor: [0, -8]
    });
    const iceIcon = L.divIcon({
        className: "station-marker db-station-marker db-station-marker--ice",
        iconSize: [20, 20],
        popupAnchor: [0, -8]
    });

    function updateStations() {
        const bounds = map.getBounds().pad(0.1);
        const zoom = map.getZoom();
        // Start with ICE stops and regional hubs, then reveal smaller stations.
        const minimumLines = zoom >= 10 ? 1 : zoom >= 8 ? 2 : zoom >= 7 ? 4 : 6;

        for (const station of stations) {
            const position = [station.lat, station.lon];
            const visible = (station.ice || station.regionalLines >= minimumLines)
                && bounds.contains(position);
            const marker = markers.get(station);

            if (visible && !marker) {
                const nextMarker = L.marker(position, {
                    icon: station.ice ? iceIcon : regionalIcon,
                    title: station.name,
                    zIndexOffset: station.ice ? 1000 : 0
                }).addTo(layer);
                bindDbStationPopup(nextMarker, station);
                nextMarker.getElement().setAttribute("aria-label", station.name);
                markers.set(station, nextMarker);
            } else if (!visible && marker) {
                layer.removeLayer(marker);
                markers.delete(station);
            }
        }
    }

    map.on("moveend", updateStations);
    updateStations();

    return station => {
        map.setView([station.lat, station.lon], Math.max(12, map.getZoom()), { animate: false });
        markers.get(station)?.openPopup();
    };
}

function normalizeStationName(name) {
    return name.trim().toLocaleLowerCase("de")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replaceAll("ß", "ss")
        .replace(/\bhbf\b/g, "hauptbahnhof");
}

function initStationSearch(stations, openStation) {
    const form = document.getElementById("stationSearch");
    const input = document.getElementById("searchInput");
    const results = document.getElementById("searchResults");
    const index = stations.map(station => ({ station, name: normalizeStationName(station.name) }));

    function selectStation(station) {
        input.value = station.name;
        input.blur();
        results.replaceChildren();
        openStation(station);
    }

    function updateResults() {
        results.replaceChildren();
        const query = normalizeStationName(input.value);
        if (query.length < 2) return;

        const matches = index
            .filter(entry => entry.name.includes(query))
            .sort((a, b) =>
                Number(b.name.startsWith(query)) - Number(a.name.startsWith(query)) ||
                Number(b.station.ice) - Number(a.station.ice) ||
                b.station.regionalLines - a.station.regionalLines
            )
            .slice(0, 8);

        for (const { station } of matches) {
            const option = document.createElement("button");
            option.type = "button";
            option.textContent = station.name;
            option.addEventListener("click", () => selectStation(station));
            results.append(option);
        }
        if (!matches.length) {
            const empty = document.createElement("div");
            empty.setAttribute("role", "status");
            empty.textContent = "Kein Bahnhof gefunden.";
            results.append(empty);
        }
    }

    input.addEventListener("input", updateResults);
    input.addEventListener("focus", updateResults);
    form.addEventListener("submit", event => {
        event.preventDefault();
        results.querySelector("button")?.click();
    });
    form.addEventListener("focusout", event => {
        if (!form.contains(event.relatedTarget)) results.replaceChildren();
    });
    form.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            event.preventDefault();
            input.focus();
            results.replaceChildren();
        }
    });
    input.disabled = false;
}

async function loadMap() {
    status.textContent = "Bahnhöfe werden geladen …";

    try {
        if (!window.L) {
            throw new Error("Leaflet failed to load");
        }

        const response = await fetch("/data/db-stations.json");
        if (!response.ok) {
            throw new Error(`Station data: HTTP ${response.status}`);
        }
        const { boundary, stations } = await response.json();
        const map = L.map("map", { zoomSnap: 0.25, minZoom: 4, zoomControl: false });
        addBaseTiles(map);
        const border = L.geoJSON(boundary, {
            interactive: false,
            style: { color: "#8b96ab", weight: 1, opacity: 0.65, fill: false }
        }).addTo(map);

        function showGermany() {
            map.closePopup();
            map.fitBounds(border.getBounds(), { padding: [20, 24], animate: false });
        }

        showGermany();
        const openStation = renderStations(map, stations);
        initStationSearch(stations, openStation);
        map.attributionControl.addAttribution(
            'Bahnhöfe (gefiltert): <a href="https://www.gtfs.de/de/feeds/">GTFS.de / DELFI e.V.</a> ' +
            '(<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>) · Grenzen: Natural Earth · ' +
            'Abfahrten: <a href="https://transitous.org/sources/">Transitous</a> · ' +
            '<a href="https://github.com/FlorianHoelzel/transitradar/issues">Kontakt</a>'
        );
        resetButton.addEventListener("click", showGermany);
        resetButton.disabled = false;
        status.hidden = true;
    } catch (error) {
        console.error(error);
        status.textContent = "Die Bahnhofskarte konnte nicht geladen werden. Lade die Seite erneut.";
    }
}

loadMap();
