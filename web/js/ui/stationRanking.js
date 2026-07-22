import { CITY_BOUNDS, CITY_CONFIG } from "../config.js";
import {
    getDisplayStationName,
    getSearchStationName
} from "../stations/stationNames.js";

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/gu, "")
        .replace(/ß/gu, "ss")
        .toLocaleLowerCase("de-DE")
        .replace(/[^a-z0-9]+/gu, " ")
        .trim();
}

function lineName(line) {
    if (typeof line === "string" || typeof line === "number") {
        return String(line);
    }

    if (!line || typeof line !== "object") {
        return "";
    }

    const value = line.name ?? line.label ?? line.symbol ?? line.product?.name;
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function linePriority(line) {
    const name = lineName(line).trim().toUpperCase();
    const metadata = line && typeof line === "object"
        ? [line.product, line.mode, line.type, line.productName, line.product?.name]
            .filter(value => typeof value === "string")
            .join(" ")
            .toUpperCase()
        : "";

    if (/^(?:S\s*\d|S-?BAHN\b)/u.test(name) || /S-?BAHN|SUBURBAN/u.test(metadata)) return 0;
    if (/^(?:U\s*\d|U-?BAHN\b)/u.test(name) || /U-?BAHN|SUBWAY/u.test(metadata)) return 1;
    if (/^(RE|RB|IRE)\s*\d/u.test(name) || /REGIONAL/u.test(metadata)) return 2;
    if (/^(M?\d+|TRAM)/u.test(name) || /TRAM/u.test(metadata)) return 3;
    if (/^(BUS|N|X)\s*\d/u.test(name) || /BUS/u.test(metadata)) return 4;
    return 5;
}

export function stationLines(station) {
    const lines = [
        ...(station.lines || []),
        ...(station.stops || []).flatMap(stop => stop.lines || [])
    ];
    const rankedLines = new Map();

    lines.forEach((line, index) => {
        const name = lineName(line);

        if (!name) {
            return;
        }

        const candidate = { name, priority: linePriority(line), index };
        const current = rankedLines.get(name);

        if (!current || candidate.priority < current.priority) {
            rankedLines.set(name, candidate);
        }
    });

    return [...rankedLines.values()]
        .sort((a, b) => {
            return a.priority - b.priority ||
                a.name.localeCompare(b.name, "de-DE", { numeric: true }) ||
                a.index - b.index;
        })
        .map(line => line.name);
}

function textMatchScore(name, query) {
    if (name === query) return 1200;
    if (name.startsWith(query)) return 900;
    if (name.split(" ").some(word => word.startsWith(query))) return 820;
    if (name.includes(query)) return 620;
    return 0;
}

function stationProducts(station) {
    const products = { ...(station.products || {}) };

    (station.stops || []).forEach(stop => {
        Object.entries(stop.products || {}).forEach(([product, available]) => {
            products[product] = products[product] || available === true;
        });
    });

    return products;
}

function importanceScore(station) {
    const products = stationProducts(station);
    const weights = {
        nationalExpress: 220,
        express: 220,
        national: 170,
        regionalExpress: 140,
        regional: 120,
        suburban: 90,
        subway: 80,
        tram: 30,
        ferry: 20,
        bus: 10
    };
    const productScore = Object.entries(weights).reduce((score, [product, weight]) => {
        return score + (products[product] === true ? weight : 0);
    }, 0);
    const lineScore = Math.min(64, stationLines(station).length * 8);
    const interchangeScore = Math.min(36, (station.stops || []).length * 4);

    return productScore + lineScore + interchangeScore;
}

function stationLocation(station) {
    if (Array.isArray(station.coordinates)) {
        return { latitude: station.coordinates[0], longitude: station.coordinates[1] };
    }

    return station.location || {};
}

function cityScore(station, normalizedName) {
    const location = stationLocation(station);
    const inCity = Number.isFinite(location.latitude) &&
        Number.isFinite(location.longitude) &&
        location.latitude >= CITY_BOUNDS.minLat &&
        location.latitude <= CITY_BOUNDS.maxLat &&
        location.longitude >= CITY_BOUNDS.minLng &&
        location.longitude <= CITY_BOUNDS.maxLng;
    const namedForCity = normalizedName.includes(normalizeText(CITY_CONFIG.name));

    return (inCity ? 80 : -80) + (namedForCity ? 100 : 0);
}

function semanticScore(normalizedName) {
    let score = 0;

    if (/\b(hauptbahnhof|hbf|central station)\b/u.test(normalizedName)) score += 110;
    if (/(?:^|\s)[a-z0-9]*(?:str|strasse|street)(?:\s|$)/u.test(normalizedName)) score -= 110;

    return score;
}

export function rankStations(stations, query, limit = 8) {
    const normalizedQuery = normalizeText(query);

    if (normalizedQuery.length < 2) {
        return [];
    }

    return stations
        .map(station => {
            const name = getDisplayStationName(station);
            const searchableName = normalizeText(getSearchStationName(station));
            const matchScore = textMatchScore(searchableName, normalizedQuery);
            const score = matchScore > 0
                ? matchScore + importanceScore(station) + cityScore(station, searchableName) + semanticScore(searchableName)
                : 0;

            return { station, name, score };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => {
            return b.score - a.score
                || a.name.localeCompare(b.name, "de-DE", { numeric: true });
        })
        .slice(0, limit);
}
