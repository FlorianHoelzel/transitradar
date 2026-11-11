import { MAP_CONFIG } from "../config.js";
import { addBaseTiles } from "./baseTiles.js";

export const map = L.map("map", {
    zoomControl: false
}).setView(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom);

addBaseTiles(map);
