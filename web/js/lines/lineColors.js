import { CITY_CONFIG } from "../config.js";

const BERLIN_LINE_COLORS = {
    // U-Bahn
    U1: "#62AD2D",
    U2: "#E30613",
    U3: "#00A89E",
    U4: "#FFD400",
    U5: "#8C5A2B",
    U6: "#8C6BB1",
    U7: "#00A3E0",
    U8: "#005CA9",
    U9: "#F39200",

    // S-Bahn
    S1: "#E95B9C",
    S15: "#E95B9C",

    S2: "#008D36",
    S25: "#008D36",
    S26: "#008D36",

    S3: "#006CB7",

    S41: "#A66A2C",
    S42: "#A66A2C",

    S45: "#C0007A",
    S46: "#C0007A",
    S47: "#C0007A",

    S5: "#F18700",

    S7: "#8B5A2B",
    S75: "#8B5A2B",

    S8: "#00A6A6",
    S85: "#00A6A6",

    S9: "#8DC63F"
};

const HAMBURG_LINE_COLORS = {
    // U-Bahn
    U1: "#0072BC",
    U2: "#EE1D23",
    U3: "#FFDC01",
    U4: "#00AAAD",

    // S-Bahn
    S1: "#4DA553",
    S2: "#95334A",
    S3: "#512C75",
    S5: "#3B87A9",
    S7: "#C07B35",

    // AKN
    A1: "#F7931D",
    A2: "#F7931D",
    A3: "#F7931D"
};

const FRANKFURT_MODE_COLORS = {
    suburban: "#008754",
    subway: "#0069B4",
    tram: "#F39200",
    premiumBus: "#A71680"
};

const FRANKFURT_TRAM_LINES = new Set([
    "11", "12", "14", "15", "16", "17", "18", "19", "20", "21", "22"
]);

const CITY_LINE_COLORS = {
    berlin: BERLIN_LINE_COLORS,
    hamburg: HAMBURG_LINE_COLORS,
    frankfurt: {}
};

const DARK_TEXT_LINES = {
    berlin: new Set(["U4"]),
    hamburg: new Set(["U3"])
};

export const LINE_COLORS = CITY_LINE_COLORS[CITY_CONFIG.id] || BERLIN_LINE_COLORS;

const METRO_TRAMS = [
    "M1", "M2", "M4", "M5", "M6", "M8", "M10", "M13", "M17"
];

const METRO_BUSES = [
    "M11", "M19", "M21", "M27", "M29", "M32", "M37",
    "M41", "M43", "M44", "M45", "M46", "M48", "M49",
    "M76", "M77", "M82", "M85"
];

function getFrankfurtBadgeStyle(name, colorKey) {
    if (CITY_CONFIG.id !== "frankfurt") {
        return null;
    }

    let background = null;

    if (/^S\d+$/u.test(colorKey)) {
        background = FRANKFURT_MODE_COLORS.suburban;
    } else if (/^U\d+$/u.test(colorKey)) {
        background = FRANKFURT_MODE_COLORS.subway;
    } else if (FRANKFURT_TRAM_LINES.has(name)) {
        background = FRANKFURT_MODE_COLORS.tram;
    } else if (/^[MX]\d+/u.test(colorKey)) {
        background = FRANKFURT_MODE_COLORS.premiumBus;
    }

    return background
        ? { background, color: "#fff", border: "none" }
        : null;
}

export function getBadgeStyle(line) {
    if (!line) {
        return {
            background: "#757575",
            color: "#fff",
            border: "none"
        };
    }

    const name = line.toString().trim();
    const colorKey = name
        .replace(/^([USA])\s*(\d+)$/i, "$1$2")
        .toUpperCase();
    const frankfurtStyle = getFrankfurtBadgeStyle(name, colorKey);

    if (frankfurtStyle) {
        return frankfurtStyle;
    }

    if (LINE_COLORS[colorKey]) {
        return {
            background: LINE_COLORS[colorKey],
            color: DARK_TEXT_LINES[CITY_CONFIG.id]?.has(colorKey) ? "#111" : "#fff",
            border: "none"
        };
    }

    if (name === "FEX") {
        return {
            background: "#F18700",
            color: "#fff",
            border: "none"
        };
    }

    if (name.startsWith("RE") || name.startsWith("RB")) {
        return {
            background: "#E30613",
            color: "#fff",
            border: "none"
        };
    }

    if (METRO_TRAMS.includes(name)) {
        return {
            background: "#C0007A",
            color: "#fff",
            border: "none"
        };
    }

    if (METRO_BUSES.includes(name)) {
        return {
            background: "#fff",
            color: "#111",
            border: "3px solid #C0007A"
        };
    }

    if (name.startsWith("X")) {
        return {
            background: "#fff",
            color: "#111",
            border: "3px solid #F18700"
        };
    }

    if (name.startsWith("N")) {
        return {
            background: "#111",
            color: "#fff",
            border: "2px solid #fff"
        };
    }

    if (name.startsWith("F")) {
        return {
            background: "#00838F",
            color: "#fff",
            border: "none"
        };
    }

    return {
        background: "#fff",
        color: "#111",
        border: "1px solid #CBD5E1"
    };
}
