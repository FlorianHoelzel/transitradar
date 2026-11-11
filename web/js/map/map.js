import { CITY_CONFIG, MAP_CONFIG } from "../config.js";
import { addBaseTiles } from "./baseTiles.js";

export const map = L.map("map", {
    zoomControl: false,
    ...(CITY_CONFIG.id === "db" ? { zoomSnap: 0.25, minZoom: 4 } : {})
}).setView(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom);

addBaseTiles(map);
