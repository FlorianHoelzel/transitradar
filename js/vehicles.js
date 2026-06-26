import { getVehicleMovements } from "./api.js";
import { map } from "./map.js";
import { createLineBadge } from "./badges.js";
import { getBadgeStyle } from "./lineColors.js";

const vehicleMarkers = {};

function animateMarker(marker, target) {
    const start = marker.getLatLng();

    const startLat = start.lat;
    const startLng = start.lng;
    const endLat = target[0];
    const endLng = target[1];

    const duration = 14500;
    const startTime = performance.now();

    function animate(now) {
        const progress = Math.min((now - startTime) / duration, 1);

        marker.setLatLng([
            startLat + (endLat - startLat) * progress,
            startLng + (endLng - startLng) * progress
        ]);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}

function clearVehicleMarkers() {
    Object.values(vehicleMarkers).forEach(marker => {
        map.removeLayer(marker);
    });

    Object.keys(vehicleMarkers).forEach(key => {
        delete vehicleMarkers[key];
    });
}

function shouldShowVehicle(movement) {
    const zoom = map.getZoom();
    const lineName = movement.line?.name || "";

    if (zoom < 13) return false;

    if (zoom < 15) {
        return (
            lineName.startsWith("S") ||
            lineName.startsWith("U") ||
            lineName.startsWith("RE") ||
            lineName.startsWith("RB") ||
            lineName === "FEX"
        );
    }

    return true;
}

function cleanStopName(name) {
    return (name || "")
        .replace(/^S\+U\s+/i, "")
        .replace(/^U\s+/i, "")
        .replace(/^S\s+/i, "")
        .replace(/\s+\(Berlin\)$/i, "");
}

function createVehicleStopsHtml(stopovers, lineColor) {
    return (stopovers || [])
        .slice(0, 5)
        .map((stopover, index, array) => {
            const name = cleanStopName(
                stopover.stop?.name ||
                stopover.name ||
                ""
            );

            const last = index === array.length - 1;

            return `
                <div class="vehicle-stop ${last ? "last" : ""}">
                    <div 
                        class="vehicle-stop-icon"
                        style="--line-color: ${lineColor};"
                    ></div>
                    <div class="vehicle-stop-name">${name}</div>
                </div>
            `;
        })
        .join("");
}

function createVehicleIcon(movement) {
    const lineName = movement.line?.name || "?";
    const badge = createLineBadge(lineName);

    return L.divIcon({
        className: "vehicle-marker",
        html: `
            <div class="vehicle-badge">
                ${badge}
            </div>
        `,
        iconSize: [44, 28],
        iconAnchor: [22, 14],
        popupAnchor: [0, -14]
    });
}

function createVehiclePopup(movement) {
    const lineName = movement.line?.name || "?";
    const style = getBadgeStyle(lineName);

    let lineColor;

    if (lineName.startsWith("M")) {
        lineColor = "#C0007A";
    } else if (lineName.startsWith("X")) {
        lineColor = "#F39200";
    } else if (/^\d+$/.test(lineName)) {
        lineColor = "#6B7280";
    } else if (style.background !== "#fff") {
        lineColor = style.background;
    } else {
        lineColor = "#6B7280";
    }

    const nextStops = createVehicleStopsHtml(
        movement.nextStopovers,
        lineColor
    );

    return `
        <div class="vehicle-popup">
            <div class="vehicle-popup-line">
                ${createLineBadge(lineName)}
            </div>

            <div class="vehicle-popup-direction">
                Richtung ${cleanStopName(movement.direction) || "Unbekannt"}
            </div>

            ${
                nextStops
                    ? `
                        <div class="vehicle-popup-title">
                            Nächste Haltestellen
                        </div>

                        <div class="vehicle-stops">
                            ${nextStops}
                        </div>
                    `
                    : ""
            }
        </div>
    `;
}

export async function updateVehicles() {
    if (map.getZoom() < 13) {
        clearVehicleMarkers();
        return;
    }

    try {
        const movements = await getVehicleMovements(map.getBounds());
        const visibleVehicleIds = new Set();

        movements.forEach(movement => {
            if (!movement.location) return;
            if (!shouldShowVehicle(movement)) return;

            const id = movement.tripId;
            visibleVehicleIds.add(id);

            const coordinates = [
                movement.location.latitude,
                movement.location.longitude
            ];

            if (vehicleMarkers[id]) {
                animateMarker(vehicleMarkers[id], coordinates);
                vehicleMarkers[id].setPopupContent(createVehiclePopup(movement));
                return;
            }

            const marker = L.marker(coordinates, {
                icon: createVehicleIcon(movement),
                zIndexOffset: 500
            }).addTo(map);

            marker.bindPopup(createVehiclePopup(movement));

            vehicleMarkers[id] = marker;
        });

        Object.keys(vehicleMarkers).forEach(id => {
            if (!visibleVehicleIds.has(id)) {
                map.removeLayer(vehicleMarkers[id]);
                delete vehicleMarkers[id];
            }
        });

    } catch (error) {
        console.error(error);
    }
}