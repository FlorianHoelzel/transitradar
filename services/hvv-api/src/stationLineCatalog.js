import { createStationLinesById } from "./normalizers.js";
import { REGULAR_S_BAHN_LINES } from "./regularLines.js";
import { STATION_LINES_BY_ID } from "./stationLines.generated.js";

const REGULAR_LINES_BY_STATION = createStationLinesById(
    [],
    REGULAR_S_BAHN_LINES
);
const REGULAR_S_BAHN_PATTERN = /^S\d+$/u;

export function getStationLines(stationId) {
    const scheduledLines = STATION_LINES_BY_ID[stationId] || [];
    const regularSBahnLines = REGULAR_LINES_BY_STATION.get(stationId) || [];

    return [
        ...scheduledLines.filter(line => !REGULAR_S_BAHN_PATTERN.test(line)),
        ...regularSBahnLines
    ];
}
