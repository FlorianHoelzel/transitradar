import { loadStationsFromApi } from "../api/transportRestApi.js";
import { BERLIN_BOUNDS } from "../config.js";

function isBerlinAreaStation(station) {
    const [lat, lng] = station.coordinates;

    return (
        lat >= BERLIN_BOUNDS.minLat &&
        lat <= BERLIN_BOUNDS.maxLat &&
        lng >= BERLIN_BOUNDS.minLng &&
        lng <= BERLIN_BOUNDS.maxLng
    );
}

function sortLines(lines) {
    return [...new Set(lines)]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "de-DE", { numeric: true }));
}

function normalizeStop(stop) {
    return {
        id: stop.id,
        name: stop.name,
        coordinates: [
            stop.location.latitude,
            stop.location.longitude
        ],
        products: stop.products || {},
        lines: (stop.lines || []).map(line => {
            return typeof line === "string" ? line : line.name;
        })
    };
}

function isValidStop(stop) {
    return Boolean(
        stop?.id &&
        stop?.name &&
        Number.isFinite(stop.location?.latitude) &&
        Number.isFinite(stop.location?.longitude)
    );
}

function createEmptyProducts() {
    return {
        subway: false,
        suburban: false,
        tram: false,
        bus: false,
        ferry: false,
        express: false,
        regional: false
    };
}

function mergeProducts(targetProducts, sourceProducts) {
    Object.keys(targetProducts).forEach(product => {
        targetProducts[product] =
            targetProducts[product] || sourceProducts[product] === true;
    });
}

function removeStopDetails(name) {
    return name
        .replace(/\s*\[[^\]]+\]\s*$/u, "")
        .replace(/\/[^()[\]]+(?=\s*(?:\(|$))/u, " ")
        .replace(/\s+/gu, " ")
        .trim();
}

function normalizeMainStationName(name) {
    return name.replace(/^([^,]+),\s*Hauptbahnhof$/iu, "$1 Hauptbahnhof");
}

function normalizeStationGroupKey(name) {
    return normalizeMainStationName(removeStopDetails(name))
        .replace(/\s*\([^)]*\)\s*/gu, " ")
        .replace(/^(?:S\+U|S|U)\s+/iu, "")
        .replace(/\bBerlin\s+Hauptbahnhof\b/iu, "Hauptbahnhof")
        .replace(/\b(?:Bf|Bhf)\b\.?/giu, "")
        .replace(/\s+/gu, " ")
        .trim()
        .toLocaleLowerCase("de-DE");
}

function getStationDisplayName(name) {
    const cleanName = removeStopDetails(name);

    if (/^S\+U Hauptbahnhof(?:\s|\(|$)/u.test(cleanName)) {
        return cleanName.replace(/^S\+U Hauptbahnhof/u, "S+U Berlin Hauptbahnhof");
    }

    return cleanName;
}

function getDisplayNameScore(name) {
    const hasDetails = /\/|\[/.test(name);
    const hasStationSuffix = /\b(?:Bf|Bhf)\b\.?/u.test(name);
    const hasBerlinQualifier = /\(Berlin\)|\bBerlin\s+Hauptbahnhof\b/u.test(name);

    return (
        (hasDetails ? 20 : 0) +
        (hasStationSuffix ? 0 : 4) +
        (hasBerlinQualifier ? 0 : 2) +
        name.length / 1000
    );
}

function chooseStationDisplayName(currentName, candidateName) {
    if (!currentName) {
        return candidateName;
    }

    return getDisplayNameScore(candidateName) < getDisplayNameScore(currentName)
        ? candidateName
        : currentName;
}

function groupStationsByName(rawStations) {
    const groupedStations = {};

    rawStations.forEach(station => {
        const stationGroupKey = normalizeStationGroupKey(station.name);
        const displayName = getStationDisplayName(station.name);

        if (!groupedStations[stationGroupKey]) {
            groupedStations[stationGroupKey] = {
                name: displayName,
                coordinates: station.coordinates,
                products: createEmptyProducts(),
                lines: [],
                stops: []
            };
        }

        groupedStations[stationGroupKey].name = chooseStationDisplayName(
            groupedStations[stationGroupKey].name,
            displayName
        );

        groupedStations[stationGroupKey].stops.push({
            id: station.id,
            name: station.name,
            coordinates: station.coordinates,
            products: station.products,
            lines: station.lines
        });

        groupedStations[stationGroupKey].lines.push(...station.lines);

        mergeProducts(groupedStations[stationGroupKey].products, station.products);
    });

    return Object.values(groupedStations)
        .map(station => {
            return {
                ...station,
                lines: sortLines(station.lines)
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "de-DE", { numeric: true }));
}

function prepareStations(rawStops) {
    const rawStations = rawStops
        .filter(isValidStop)
        .map(normalizeStop)
        .filter(isBerlinAreaStation);

    return groupStationsByName(rawStations);
}

export async function loadStations() {
    try {
        console.log("Loading stations from VBB API.");
        const data = await loadStationsFromApi();

        return prepareStations(data);
    } catch (error) {
        console.error("Failed to load stations from VBB API:", error);
        return [];
    }
}
