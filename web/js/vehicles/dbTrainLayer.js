import { getDbTrainPosition, loadDbTrainTrips } from "../api/dbTrainTrips.js";
import { createLineBadge } from "../lines/badges.js";
import { formatClockTime } from "../settings/departureTime.js";
import { escapeHtml } from "../ui/escapeHtml.js";
import { setupVehiclePopupLifecycle } from "./vehiclePopupLifecycle.js";

const REFRESH_MS = 120_000;
const MIN_REQUEST_INTERVAL = 15_000;
const DETAIL_ZOOM = 9;

function isInsideRing([lat, lon], ring) {
    let inside = false;
    let [previousLon, previousLat] = ring.at(-1);
    for (const [nextLon, nextLat] of ring) {
        if ((nextLat > lat) !== (previousLat > lat) &&
            lon < nextLon + (lat - nextLat) * (previousLon - nextLon) / (previousLat - nextLat)) {
            inside = !inside;
        }
        previousLon = nextLon;
        previousLat = nextLat;
    }
    return inside;
}

function createTrainIcon(name, overview) {
    const label = overview ? '<span class="db-overview-train" aria-hidden="true"></span>' : createLineBadge(name);
    return L.divIcon({
        className: "vehicle-marker db-train-marker",
        html: `<div class="vehicle-badge">${label}</div>`,
        iconSize: overview ? [24, 24] : [44, 28],
        iconAnchor: overview ? [12, 12] : [22, 14],
        popupAnchor: [0, overview ? -10 : -14]
    });
}

function createTrainPopup(name, { path, stopped }) {
    const stopLabel = stopped ? "Aktueller Halt" : "Nächster Halt";
    const arrival = stopped ? "" : ` · ${formatClockTime(path.arrival, "Europe/Berlin")}`;
    const source = path.realTime ? "mit Echtzeitdaten" : "nach Fahrplan";
    return `
        <div class="vehicle-popup db-train-popup">
            <div class="vehicle-popup-line">${createLineBadge(name)}</div>
            <div class="vehicle-popup-title">${stopLabel}${arrival}</div>
            <div class="vehicle-popup-direction">${escapeHtml(path.nextStop || "Unbekannt")}</div>
            <div class="db-train-source">Position geschätzt · ${source}</div>
        </div>
    `;
}

export function initDbTrainLayer(map, boundary, countryBounds) {
    const toggle = document.getElementById("dbTrainToggle");
    const status = document.getElementById("dbTrainStatus");
    const layer = L.layerGroup().addTo(map);
    const markers = new Map();
    const snapshots = new Map();
    const nextRequestAt = new Map();
    const polygons = boundary.coordinates.map(([outer, ...holes]) => ({
        outer,
        holes,
        bounds: L.latLngBounds(outer.map(([lon, lat]) => [lat, lon]))
    }));
    let enabled = false;
    let requestRunning = false;
    let refreshTimer;
    let movementTimer;

    function setStatus(message) {
        if (status.textContent !== message) status.textContent = message;
    }

    function getView() {
        const viewport = map.getBounds();
        if (!countryBounds.intersects(viewport)) return null;

        const padded = viewport.pad(0.15);
        const overview = map.getZoom() < DETAIL_ZOOM ||
            padded.getNorth() - padded.getSouth() > 1.8 ||
            padded.getEast() - padded.getWest() > 3.5;
        const snapshot = snapshots.get(overview);
        const covered = overview || snapshot?.bounds.contains(viewport);
        const current = covered || snapshot?.bounds.intersects(viewport) ? snapshot : null;
        return { overview, bounds: overview ? countryBounds : padded, snapshot: current, covered };
    }

    function render() {
        const view = enabled ? getView() : null;
        const visible = new Set();
        const bounds = map.getBounds();
        const now = Date.now();

        const snapshot = view?.snapshot;
        const trains = snapshot && now < snapshot.expiresAt + 30_000 ? snapshot.trains : null;
        for (const [id, train] of trains || []) {
            const position = getDbTrainPosition(train, now);
            if (!position || !bounds.contains(position.coordinates)) continue;
            const inGermany = polygons.some(({ bounds: extent, outer, holes }) =>
                extent.contains(position.coordinates) && isInsideRing(position.coordinates, outer) &&
                !holes.some(hole => isInsideRing(position.coordinates, hole))
            );
            if (!inGermany) continue;

            visible.add(id);
            const marker = markers.get(id);
            if (marker) {
                marker.setLatLng(position.coordinates);
                if (marker.trainOverview !== view.overview) {
                    marker.trainOverview = view.overview;
                    marker.setIcon(createTrainIcon(train.name, view.overview));
                    marker.getElement().setAttribute("aria-label", train.name);
                }
                const changed = marker.trainPosition.path !== position.path ||
                    marker.trainPosition.stopped !== position.stopped;
                marker.trainPosition = position;
                if (changed && marker.isPopupOpen()) marker.getPopup().update();
                continue;
            }

            const newMarker = L.marker(position.coordinates, {
                icon: createTrainIcon(train.name, view.overview),
                title: train.name,
                zIndexOffset: 1100
            }).addTo(layer);
            newMarker.trainPosition = position;
            newMarker.trainOverview = view.overview;
            newMarker.getElement().setAttribute("aria-label", train.name);
            newMarker.bindPopup(() => createTrainPopup(train.name, newMarker.trainPosition), {
                className: "db-train-leaflet-popup",
                closeButton: false,
                autoPanPadding: [16, 16]
            });
            setupVehiclePopupLifecycle(newMarker);
            markers.set(id, newMarker);
        }

        for (const [id, marker] of markers) {
            if (visible.has(id)) continue;
            layer.removeLayer(marker);
            markers.delete(id);
        }
    }

    async function refresh() {
        clearTimeout(refreshTimer);
        if (!enabled || document.hidden) return;
        const view = getView();
        if (!view) {
            setStatus("Keine Züge im Kartenausschnitt.");
            return;
        }

        const now = Date.now();
        if (view.covered && view.snapshot?.expiresAt > now) {
            setStatus(view.snapshot.error ? "Zugdaten vorübergehend nicht verfügbar." : view.overview
                ? "ICE-Positionen geschätzt · Für Regionalzüge hineinzoomen."
                : "Positionen geschätzt");
            refreshTimer = setTimeout(refresh, view.snapshot.expiresAt - now);
            return;
        }

        setStatus("Züge werden geladen …");
        if (requestRunning) return;
        const availableAt = nextRequestAt.get(view.overview) || 0;
        if (availableAt > now) {
            refreshTimer = setTimeout(refresh, availableAt - now);
            return;
        }

        requestRunning = true;
        nextRequestAt.set(view.overview, now + MIN_REQUEST_INTERVAL);
        try {
            const trains = await loadDbTrainTrips(view.bounds, view.overview);
            snapshots.set(view.overview, { bounds: view.bounds, trains, expiresAt: now + REFRESH_MS });
        } catch (error) {
            console.warn("DB-Zugdaten konnten nicht geladen werden:", error);
            snapshots.set(view.overview, { bounds: view.bounds, error: true, expiresAt: now + REFRESH_MS });
        } finally {
            requestRunning = false;
            if (enabled && !document.hidden) render();
            void refresh();
        }
    }

    function syncLayer() {
        clearInterval(movementTimer);
        if (!document.hidden) render();
        if (enabled && !document.hidden) movementTimer = setInterval(render, 1000);
        void refresh();
    }

    toggle.addEventListener("click", () => {
        enabled = !enabled;
        toggle.setAttribute("aria-pressed", String(enabled));
        status.hidden = !enabled;
        if (!enabled) setStatus("");
        syncLayer();
    });
    document.addEventListener("visibilitychange", syncLayer);
    map.on("moveend", () => {
        if (!enabled || document.hidden) return;
        render();
        void refresh();
    });
    toggle.disabled = false;
}
