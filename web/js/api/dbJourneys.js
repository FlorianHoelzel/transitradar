import { DB_RAIL_MODES, getDbTrainName } from "./dbRailModes.js";
import { getDbLegGeometry } from "./dbTrainTrips.js?v=db-ui-1";
import { fetchJson } from "./httpClient.js";

function toLocation(place) {
    return { name: place?.name, location: { latitude: place?.lat, longitude: place?.lon } };
}

export function normalizeDbJourneys(itineraries) {
    return itineraries.flatMap(itinerary => {
        const legs = itinerary.legs.map(leg => {
            const walking = leg.mode === "WALK";
            const line = walking ? null : getDbTrainName(leg.mode, leg);
            if (leg.cancelled || (!walking && !line)) return null;

            return {
                walking,
                line: line ? { name: line } : null,
                departure: leg.startTime,
                arrival: leg.endTime,
                plannedDeparture: leg.scheduledStartTime,
                plannedArrival: leg.scheduledEndTime,
                duration: leg.duration,
                origin: toLocation(leg.from),
                destination: toLocation(leg.to),
                polyline: getDbLegGeometry(leg)
            };
        });
        return legs.every(Boolean) && legs.some(leg => !leg.walking)
            ? [{ legs, transfers: itinerary.transfers, duration: itinerary.duration }]
            : [];
    });
}

export async function getDbJourneys({ from, to, departure, arrival }) {
    const query = new URLSearchParams({
        fromPlace: from.coordinates.join(","),
        toPlace: to.coordinates.join(","),
        radius: "500",
        transitModes: DB_RAIL_MODES.join(","),
        numItineraries: "5",
        language: "de"
    });
    if (arrival || departure) query.set("time", arrival || departure);
    if (arrival) query.set("arriveBy", "true");

    const { itineraries } = await fetchJson(
        `https://api.transitous.org/api/v6/plan?${query}`,
        "DB-Verbindungen konnten nicht geladen werden.",
        15_000
    );
    return normalizeDbJourneys(itineraries);
}
