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

function getStationLines(station) {
    const stopLines = station.stops?.flatMap(stop => stop.lines || []) || [];

    return [
        ...(station.lines || []),
        ...stopLines
    ].filter(Boolean);
}

function hasLinePrefix(station, prefixes) {
    return getStationLines(station).some(line => {
        return prefixes.some(prefix => String(line).startsWith(prefix));
    });
}

export function getStationIcon(station) {
    const name = station.name.toLowerCase();

    if (
        name.startsWith("s+u ") ||
        name.startsWith("s ") ||
        station.products?.suburban ||
        hasLinePrefix(station, ["S"])
    ) {
        return suburbanIcon;
    }

    if (
        name.startsWith("u ") ||
        station.products?.subway ||
        hasLinePrefix(station, ["U"])
    ) {
        return subwayIcon;
    }

    return busIcon;
}
