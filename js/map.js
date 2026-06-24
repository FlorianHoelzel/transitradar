import { getDepartures } from "./api.js";
import { createPopupContent, createDeparturesHtml } from "./popup.js";

export const map = L.map("map").setView([52.52, 13.40], 12);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO"
}).addTo(map);

const stationIcon = L.divIcon({
    className: "station-pin",
    html: "📍",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

export const markers = {};

export function updateVisibleMarkers(stations) {
    const bounds = map.getBounds();

    Object.values(markers).forEach(marker => {
        map.removeLayer(marker);
    });

    Object.keys(markers).forEach(key => {
        delete markers[key];
    });

    const visibleStations = stations.filter(station =>
        bounds.contains(station.coordinates)
    );

    visibleStations.slice(0, 300).forEach(station => {
        const marker = L.marker(station.coordinates, {
            icon: stationIcon
        }).addTo(map);

        marker.bindPopup(createPopupContent(station));

        marker.on("popupopen", async () => {

            const popupElement = marker.getPopup().getElement();
            const departuresContainer = popupElement.querySelector(".departures");

            try {
                const departures = await getDepartures(station);

                const departuresHtml = createDeparturesHtml(departures);

                departuresContainer.innerHTML = departuresHtml;

            } catch (error) {
                console.error("Fehler beim Laden der Abfahrten:", error);

                departuresContainer.innerHTML = "Abfahrten konnten nicht geladen werden.";
            }
        });

        markers[station.name] = marker;
    });
}