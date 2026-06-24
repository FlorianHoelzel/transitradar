const API_BASE = "https://v6.bvg.transport.rest";

export async function loadStationsFromApi() {
    const response = await fetch(`${API_BASE}/stops?results=1000`);

    if (!response.ok) {
        throw new Error("Stations konnten nicht geladen werden.");
    }

    return await response.json();
}

function getCleanStopId(stopId) {
    const parts = stopId.split(":");

    if (parts.length >= 3) {
        return parts[2];
    }

    return stopId;
}

export async function getDepartures(station) {
    const allDepartures = [];

    const uniqueStopIds = [
        ...new Set(station.stops.map(stop => getCleanStopId(stop.id)))
    ];

    for (const stopId of uniqueStopIds) {
        const response = await fetch(
            `${API_BASE}/stops/${stopId}/departures?results=5&duration=20`
        );

        if (!response.ok) {
            console.error("Fehler bei Stop:", stopId, response.status);
            continue;
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            allDepartures.push(...data);
        } else if (data.departures) {
            allDepartures.push(...data.departures);
        }
    }

    return allDepartures
        .filter(departure => departure.when)
        .sort((a, b) => new Date(a.when) - new Date(b.when))
        .slice(0, 8);
}