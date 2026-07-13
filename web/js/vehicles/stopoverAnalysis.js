import { cleanStopName } from "./vehicleUtils.js";

function getStopName(stopover) {
    return cleanStopName(stopover?.stop?.name || stopover?.name || "");
}

function formatTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function getMinutesDiff(value) {
    if (!value) {
        return "-";
    }

    const diffMs = new Date(value) - new Date();
    return Math.round(diffMs / 1000 / 60);
}

export function logNextStopovers(movement) {
    if (!movement.nextStopovers || movement.nextStopovers.length === 0) {
        return;
    }

    const lineName = movement.line?.name || "?";
    const direction = cleanStopName(movement.direction);

    console.groupCollapsed(`NextStopovers | ${lineName} Richtung ${direction}`);

    console.log("Vehicle:", {
        line: lineName,
        direction,
        tripId: movement.tripId,
        location: movement.location
    });

    console.table(
        movement.nextStopovers.map((stopover, index) => {
            return {
                index,
                name: getStopName(stopover),
                arrival: formatTime(stopover.arrival),
                departure: formatTime(stopover.departure),
                plannedArrival: formatTime(stopover.plannedArrival),
                plannedDeparture: formatTime(stopover.plannedDeparture),
                arrivalInMin: getMinutesDiff(stopover.arrival),
                departureInMin: getMinutesDiff(stopover.departure),
                hasStopLocation: Boolean(stopover.stop?.location)
            };
        })
    );

    console.groupEnd();
}