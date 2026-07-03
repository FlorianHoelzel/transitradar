const subwayIcon = L.divIcon({
    className: "station-marker subway-marker",
    html: "●",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
});

const suburbanIcon = L.divIcon({
    className: "station-marker suburban-marker",
    html: "●",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
});

const busIcon = L.divIcon({
    className: "station-marker bus-marker",
    html: "●",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6]
});

export function getStationIcon(station) {
    const name = station.name.toLowerCase();

    if (
        name.startsWith("s+u ") ||
        name.startsWith("s ") ||
        station.products?.suburban
    ) {
        return suburbanIcon;
    }

    if (name.startsWith("u ") || station.products?.subway) {
        return subwayIcon;
    }

    return busIcon;
}
