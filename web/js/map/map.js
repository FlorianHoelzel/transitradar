import { MAP_CONFIG } from "../config.js";

export const map = L.map("map", {
    zoomControl: false
}).setView(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO"
}).addTo(map);