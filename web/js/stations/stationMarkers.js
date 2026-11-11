import { stopPopupRefresh } from "./popupController.js";
import {
    stationMarkers,
    removeStationMarker,
    getStationMarkerKey
} from "./stationMarkerStore.js";
import { renderStationMarker } from "./stationRenderer.js";
import { getVisibleStations } from "./stationVisibility.js";
import { map } from "../map/map.js";

export { stopPopupRefresh };
export { stationMarkers as markers };
export { getStationMarkerKey };

export function updateVisibleMarkers(stations) {
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const visibleStations = getVisibleStations(stations, bounds, zoom);
    const visibleStationNames = new Set(
        visibleStations.map(getStationMarkerKey)
    );

    Object.entries(stationMarkers).forEach(([stationName, marker]) => {
        if (visibleStationNames.has(stationName) || marker.isPopupOpen()) {
            return;
        }

        removeStationMarker(stationName, map);
    });

    visibleStations.forEach(station => {
        if (!stationMarkers[getStationMarkerKey(station)]) {
            renderStationMarker(station);
        }
    });
}
