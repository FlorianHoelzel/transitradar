import { MAP_DEFAULT_VIEW } from "../config.js";

export const map = L.map("map", {
    zoomControl: false
}).setView(MAP_DEFAULT_VIEW.center, MAP_DEFAULT_VIEW.zoom);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO"
}).addTo(map);