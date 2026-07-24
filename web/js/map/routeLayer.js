import { loadTripDetails } from "./routeService.js";
import { map } from "./map.js";
import { getLineColor } from "../vehicles/vehicleUtils.js";
import { createLineBadge } from "../lines/badges.js";
import {
    extractRouteCoordinateSegments,
    leafletRouteCoordinates
} from "./routeGeometry.js";

let activeRouteLayer = null;
let activeGlowLayer = null;
let activeJourneyLayerGroup = null;
let routePreviewControl = null;
let journeyRouteControl = null;
let routeRequestId = 0;

export let activeTripDetails = null;

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

function showJourneyRouteControl(summaryElement) {
    if (!journeyRouteControl) {
        journeyRouteControl = document.createElement("div");
        journeyRouteControl.className = "selected-line-control journey-route-control";
        journeyRouteControl.innerHTML = `
            <div class="journey-route-card" aria-hidden="true"></div>
            <button class="selected-line-clear" type="button">Route entfernen</button>
        `;
        journeyRouteControl
            .querySelector("button")
            .addEventListener("click", () => clearRouteLayer());
        document.body.appendChild(journeyRouteControl);
    }

    const summary = journeyRouteControl.querySelector(".journey-route-card");
    summary.replaceChildren(...[...summaryElement.children].map(child => child.cloneNode(true)));

    journeyRouteControl.classList.add("visible");
}

function hideJourneyRouteControl() {
    journeyRouteControl?.classList.remove("visible");
}

export function clearRouteLayer({ notify = true } = {}) {
    routeRequestId += 1;
    activeTripDetails = null;
    const clearedJourney = Boolean(activeJourneyLayerGroup);

    if (activeGlowLayer) {
        map.removeLayer(activeGlowLayer);
        activeGlowLayer = null;
    }

    if (activeRouteLayer) {
        map.removeLayer(activeRouteLayer);
        activeRouteLayer = null;
    }

    if (activeJourneyLayerGroup) {
        map.removeLayer(activeJourneyLayerGroup);
        activeJourneyLayerGroup = null;
    }

    hideRoutePreviewControl();
    hideJourneyRouteControl();

    if (notify && clearedJourney) {
        window.dispatchEvent(new CustomEvent("journeyRoute:cleared"));
    }
}

export async function showRouteForTrip(tripId, lineName, options = {}) {
    clearRouteLayer();
    const requestId = routeRequestId;

    if (!tripId || !lineName) {
        return;
    }

    const showControl = options.showControl ?? false;

    try {
        const data = await loadTripDetails(tripId, lineName);

        if (!data) {
            console.warn("Keine Fahrtdaten verfügbar.");
            return;
        }

        if (requestId !== routeRequestId) {
            return;
        }

        activeTripDetails = data;

        const polyline = data.trip?.polyline
            || data.polyline
            || options.fallbackPolyline;
        const segments = extractRouteCoordinateSegments(polyline);

        if (segments.length === 0) {
            console.warn("Keine Routenkoordinaten gefunden.");
            return;
        }

        const coordinates = leafletRouteCoordinates(segments);
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
        console.error("Route konnte nicht angezeigt werden:", error);
    }
}

function fallbackLegCoordinates(leg) {
    return [leg?.origin, leg?.destination]
        .map(stop => stop?.location)
        .filter(location => {
            return Number.isFinite(location?.latitude)
                && Number.isFinite(location?.longitude);
        })
        .map(location => [location.latitude, location.longitude]);
}

export function showJourneyRoute(journey, { summaryElement } = {}) {
    clearRouteLayer({ notify: false });

    if (!journey?.legs?.length) {
        return;
    }

    const layers = [];

    journey.legs.forEach(leg => {
        const segments = extractRouteCoordinateSegments(leg.polyline);
        const fallbackCoordinates = fallbackLegCoordinates(leg);
        const routeCoordinates = segments.length > 0
            ? leafletRouteCoordinates(segments)
            : fallbackCoordinates;

        if (segments.length === 0 && fallbackCoordinates.length < 2) {
            return;
        }

        const walking = Boolean(leg.walking || !leg.line);
        const color = walking ? "#94a3b8" : getLineColor(leg.line?.name || "");

        if (!walking) {
            layers.push(L.polyline(routeCoordinates, {
                color,
                weight: 12,
                opacity: 0.15,
                lineCap: "round",
                lineJoin: "round",
                interactive: false
            }));
        }

        layers.push(L.polyline(routeCoordinates, {
            color,
            weight: walking ? 4 : 6,
            opacity: walking ? 0.8 : 1,
            dashArray: walking ? "6 7" : null,
            lineCap: "round",
            lineJoin: "round",
            interactive: false
        }));
    });

    if (layers.length === 0) {
        return;
    }

    activeJourneyLayerGroup = L.featureGroup(layers).addTo(map);
    if (summaryElement) {
        showJourneyRouteControl(summaryElement);
    }
    const bounds = activeJourneyLayerGroup.getBounds();

    if (bounds.isValid()) {
        const compactLayout = window.matchMedia("(max-width: 600px)").matches;
        const pinnedCardRight = journeyRouteControl?.getBoundingClientRect().right || 420;

        map.fitBounds(bounds, {
            paddingTopLeft: compactLayout ? [30, 110] : [Math.ceil(pinnedCardRight + 20), 50],
            paddingBottomRight: compactLayout ? [30, 120] : [30, 50],
            maxZoom: 15
        });
    }
}
