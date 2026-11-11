export const DB_RAIL_MODES = ["HIGHSPEED_RAIL", "LONG_DISTANCE", "REGIONAL_FAST_RAIL", "REGIONAL_RAIL"];

const EXCLUDED_REGIONAL_LINE = /^(?:S(?:-?BAHN)?|RS)\s*\d|^S(?:-?BAHN)?$|^SEV/iu;
const ICE_LABEL = /^ICE(?:\s*(\d+[A-Z]?))?$/iu;

export function getDbTrainName(mode, { routeShortName, displayName, tripShortName }) {
    if (mode === "HIGHSPEED_RAIL" || mode === "LONG_DISTANCE") {
        let isIce = false;
        for (const label of [tripShortName, displayName, routeShortName]) {
            const match = label?.trim().match(ICE_LABEL);
            if (match?.[1]) return `ICE ${match[1]}`;
            if (match) isIce = true;
        }
        return isIce ? "ICE" : null;
    }

    if (mode !== "REGIONAL_FAST_RAIL" && mode !== "REGIONAL_RAIL") return null;
    const name = routeShortName?.trim() || displayName?.trim().replace(/\s+\(\d+\)$/u, "");
    return name && !EXCLUDED_REGIONAL_LINE.test(name) ? name : null;
}
