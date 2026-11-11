export function addBaseTiles(map) {
    return L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_2zqh_1_1f1e0f55627ea8f70c6c18c9", {
        attribution: "&copy; OpenStreetMap &copy; CARTO"
    }).addTo(map);
}
