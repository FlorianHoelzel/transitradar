import { fetchJson } from "./httpClient.js";
import { DB_RAIL_MODES, getDbTrainName } from "./dbRailModes.js";

const MAP_TRIPS_URL = "https://api.transitous.org/api/v6/map/trips";
const LOOKAHEAD_MS = 150_000;

function decodePolyline(encoded, precision) {
    const scale = 10 ** precision;
    let index = 0;
    let lat = 0;
    let lon = 0;
    const points = [];

    function readDelta() {
        let value = 0;
        for (let shift = 0; shift < 30 && index < encoded.length; shift += 5) {
            const chunk = encoded.charCodeAt(index++) - 63;
            if (chunk < 0 || chunk > 63) return NaN;
            value |= (chunk & 31) << shift;
            if (chunk < 32) return value & 1 ? ~(value >> 1) : value >> 1;
        }
        return NaN;
    }

    while (index < encoded.length) {
        lat += readDelta();
        lon += readDelta();
        if (!(Math.abs(lat) <= 90 * scale && Math.abs(lon) <= 180 * scale)) return [];
        points.push([lat / scale, lon / scale]);
    }
    return points;
}

function cumulativeDistances(points) {
    let distance = 0;
    return points.map(([lat, lon], index) => {
        if (index > 0) {
            const [previousLat, previousLon] = points[index - 1];
            const longitudeScale = Math.cos((lat + previousLat) * Math.PI / 360);
            distance += Math.hypot(lat - previousLat, (lon - previousLon) * longitudeScale);
        }
        return distance;
    });
}

export function normalizeDbTrainTrips(segments, { overview, precision }) {
    const trains = new Map();

    for (const segment of segments) {
        if (segment.cancelled || !DB_RAIL_MODES.includes(segment.mode) ||
            typeof segment.polyline !== "string") continue;
        const departure = Date.parse(segment.departure);
        const arrival = Date.parse(segment.arrival);
        if (!(arrival > departure)) continue;

        const services = (segment.trips || []).map(trip => {
            const name = getDbTrainName(segment.mode, trip);
            return name && trip.tripId ? { id: trip.tripId, name } : null;
        }).filter(service => service && (!overview || service.name.startsWith("ICE")));
        if (!services.length) continue;

        const points = decodePolyline(segment.polyline, precision);
        if (points.length < 2) continue;
        const distances = cumulativeDistances(points);
        const path = {
            departure,
            arrival,
            nextStop: segment.to?.name,
            fromStopId: segment.from?.parentId || segment.from?.stopId,
            toStopId: segment.to?.parentId || segment.to?.stopId,
            realTime: segment.realTime === true,
            points,
            distances
        };
        for (const { id, name } of services) {
            // An ICE number identifies the same train across overlapping feeds.
            const key = /^ICE \d/u.test(name) ? name : id;
            if (!trains.has(key)) trains.set(key, { name, paths: [] });
            trains.get(key).paths.push(path);
        }
    }

    return trains;
}

export function getDbTrainPosition(train, now) {
    let active;
    let previous;
    let next;
    for (const path of train.paths) {
        if (path.departure <= now && now < path.arrival) {
            if (!active || Number(path.realTime) > Number(active.realTime) ||
                (path.realTime === active.realTime && path.departure > active.departure)) {
                active = path;
            }
        } else if (path.arrival <= now && (!previous || path.arrival > previous.arrival)) {
            previous = path;
        } else if (path.departure > now && (!next || path.departure < next.departure)) {
            next = path;
        }
    }

    if (!active) {
        // Keep the marker at a stop during a timed dwell with a known onward leg.
        if (previous?.toStopId && previous.toStopId === next?.fromStopId &&
            next.departure - previous.arrival <= 300_000) {
            return { coordinates: previous.points.at(-1), path: previous, stopped: true };
        }
        return null;
    }

    const { points, distances, departure, arrival } = active;
    const target = distances.at(-1) * (now - departure) / (arrival - departure);
    let low = 1;
    let high = distances.length - 1;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (distances[mid] < target) low = mid + 1;
        else high = mid;
    }
    const length = distances[low] - distances[low - 1];
    const fraction = length ? (target - distances[low - 1]) / length : 0;
    const coordinates = points[low - 1].map((coordinate, axis) =>
        coordinate + fraction * (points[low][axis] - coordinate)
    );
    return { coordinates, path: active, stopped: false };
}

export async function loadDbTrainTrips(bounds, overview) {
    const now = Date.now();
    const precision = overview ? 2 : 4;
    const query = new URLSearchParams({
        min: `${bounds.getSouth().toFixed(3)},${bounds.getWest().toFixed(3)}`,
        max: `${bounds.getNorth().toFixed(3)},${bounds.getEast().toFixed(3)}`,
        // MOTIS uses this zoom to select transport modes independently of the map zoom.
        zoom: overview ? "5" : "7",
        precision: String(precision),
        startTime: new Date(now - 30_000).toISOString(),
        endTime: new Date(now + LOOKAHEAD_MS).toISOString(),
        language: "de"
    });
    const segments = await fetchJson(`${MAP_TRIPS_URL}?${query}`, "Zugfahrten konnten nicht geladen werden.");
    return normalizeDbTrainTrips(segments, { overview, precision });
}
