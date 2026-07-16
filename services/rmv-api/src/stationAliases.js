const FRANKFURT_HBF_ID = "3000010";
const DEPARTURE_STATION_ALIASES = new Map(
    [
        "3000008",
        "3060865",
        "3007011"
    ].map(stationId => [stationId, FRANKFURT_HBF_ID])
);

export function getDepartureStationId(stationId) {
    return DEPARTURE_STATION_ALIASES.get(String(stationId)) || stationId;
}
