import { createPopupContent } from "./stationPopup.js";
import {
    handleStationPopupOpen,
    handleStationPopupClose
} from "./popupController.js";
import { getStationIcon } from "./stationIcons.js";
import { getStationMarkerKey, setStationMarker } from "./stationMarkerStore.js";
import { map } from "../map/map.js";
import { CITY_CONFIG } from "../config.js";
import { bindDbStationPopup } from "./dbStationPopup.js";

export function renderStationMarker(station) {
    const marker = L.marker(station.coordinates, {
        icon: getStationIcon(station),
        ...(CITY_CONFIG.id === "db"
            ? { title: station.name, zIndexOffset: station.ice ? 1000 : 0 }
            : { zIndexOffset: 2000 })
    }).addTo(map);

    setStationMarker(getStationMarkerKey(station), marker);
    if (CITY_CONFIG.id === "db") {
        marker.getElement().setAttribute("aria-label", station.name);
        bindDbStationPopup(marker, station);
        return;
    }

    marker.bindPopup(createPopupContent(station), {
        closeButton: false,
        autoPanPaddingTopLeft: L.point(10, 10),
        autoPanPaddingBottomRight: L.point(10, 10)
    });

    marker.on("popupopen", async () => {
        await handleStationPopupOpen(marker, station);
    });

    marker.on("popupclose", () => {
        handleStationPopupClose();
    });
}
