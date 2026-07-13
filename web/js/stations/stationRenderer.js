import { createPopupContent } from "./stationPopup.js";
import {
    handleStationPopupOpen,
    handleStationPopupClose
} from "./popupController.js";
import { getStationIcon } from "./stationIcons.js";
import { setStationMarker } from "./stationMarkerStore.js";
import { map } from "../map/map.js";

export function renderStationMarker(station) {
    const marker = L.marker(station.coordinates, {
        icon: getStationIcon(station),
        zIndexOffset: 2000
    }).addTo(map);

    setStationMarker(station.name, marker);

    marker.bindPopup(createPopupContent(station), {
        closeButton: false
    });

    marker.on("popupopen", async () => {
        await handleStationPopupOpen(marker, station);
    });

    marker.on("popupclose", () => {
        handleStationPopupClose();
    });
}
