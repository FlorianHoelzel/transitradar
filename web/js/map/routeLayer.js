import { loadTripDetails } from "./routeService.js";
import { map } from "./map.js";
import { getLineColor } from "../vehicles/vehicleUtils.js";
import { createLineBadge } from "../lines/badges.js";

let activeRouteLayer = null;
let activeGlowLayer = null;
let routePreviewControl = null;

export let activeTripDetails = null;

function extractRouteCoordinates(polyline) {
    if (!polyline) {
        return [];
    }

    if (polyline.type === "FeatureCollection") {
        return polyline.features
            .flatMap(feature => extractRouteCoordinates(feature))
            .filter(Boolean);
    }

    if (polyline.type === "Feature") {
        return extractRouteCoordinates(polyline.geometry);
    }

    if (polyline.type === "LineString") {
        return polyline.coordinates.map(coordinate => {
            return [coordinate[1], coordinate[0]];
        });
    }

    if (polyline.type === "MultiLineString") {
        return polyline.coordinates
            .flat()
            .map(coordinate => {
                return [coordinate[1], coordinate[0]];
            });
    }

    if (polyline.type === "Point") {
        return [[polyline.coordinates[1], polyline.coordinates[0]]];
    }

    return [];
}

function createRoutePreviewControl() {
    if (routePreviewControl) {
        return;
    }

    routePreviewControl = document.createElement("div");
    routePreviewControl.className = "selected-line-control route-preview-control";

    routePreviewControl.innerHTML = `
        <div class="selected-line-label"></div>
        <button class="selected-line-clear">Schließen</button>
    `;

    document.body.appendChild(routePreviewControl);

    routePreviewControl
        .querySelector(".selected-line-clear")
        .addEventListener("click", () => {
            clearRouteLayer();
        });
}

function showRoutePreviewControl(lineName) {
    createRoutePreviewControl();

    routePreviewControl
        .querySelector(".selected-line-label")
        .innerHTML = `
            <span>Routenvorschau</span>
            ${createLineBadge(lineName)}
        `;

    routePreviewControl.classList.add("visible");
}

function hideRoutePreviewControl() {
    if (!routePreviewControl) {
        return;
    }

    routePreviewControl.classList.remove("visible");
}

export function clearRouteLayer() {
    activeTripDetails = null;

    if (activeGlowLayer) {
        map.removeLayer(activeGlowLayer);
        activeGlowLayer = null;
    }

    if (activeRouteLayer) {
        map.removeLayer(activeRouteLayer);
        activeRouteLayer = null;
    }

    hideRoutePreviewControl();
}

export async function showRouteForTrip(tripId, lineName, options = {}) {
    clearRouteLayer();

    if (!tripId || !lineName) {
        return;
    }

    const showControl = options.showControl ?? false;

    try {
        const data = await loadTripDetails(tripId, lineName);

        if (!data) {
            console.warn("No trip data available.");
            return;
        }

        activeTripDetails = data;

        const polyline = data.trip?.polyline || data.polyline;
        const coordinates = extractRouteCoordinates(polyline);

        if (coordinates.length < 2) {
            console.warn("No route coordinates found.");
            return;
        }

        const lineColor = getLineColor(lineName);

        activeGlowLayer = L.polyline(coordinates, {
            color: lineColor,
            weight: 16,
            opacity: 0.18,
            lineCap: "round",
            lineJoin: "round",
            interactive: false
        }).addTo(map);

        activeRouteLayer = L.polyline(coordinates, {
            color: lineColor,
            weight: 7,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
            interactive: false
        }).addTo(map);

        activeGlowLayer.bringToBack();
        activeRouteLayer.bringToFront();

        if (showControl) {
            showRoutePreviewControl(lineName);
        }
    } catch (error) {
        console.error("Route could not be displayed:", error);
    }
}
