import { stopPopupRefresh } from "./popupController.js";
import {
    stationMarkers,
    clearStationMarkers
} from "./stationMarkerStore.js";
import { renderStationMarker } from "./stationRenderer.js";
import { getVisibleStations } from "./stationVisibility.js";
import { map } from "../map/map.js";

export { stopPopupRefresh };
export { stationMarkers as markers };

export function updateVisibleMarkers(stations) {
    const bounds = map.getBounds();
    const zoom = map.getZoom();

    clearStationMarkers(map);

    const visibleStations = getVisibleStations(stations, bounds, zoom);

    visibleStations.forEach(station => {
        renderStationMarker(station);
    });
}