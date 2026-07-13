export const LINE_COLORS = {
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

const METRO_TRAMS = [
    "M1", "M2", "M4", "M5", "M6", "M8", "M10", "M13", "M17"
];

const METRO_BUSES = [
    "M11", "M19", "M21", "M27", "M29", "M32", "M37",
    "M41", "M43", "M44", "M45", "M46", "M48", "M49",
    "M76", "M77", "M82", "M85"
];

export function getBadgeStyle(line) {
    if (!line) {
        return {
            background: "#757575",
            color: "#fff",
            border: "none"
        };
    }

    const name = line.toString().trim();

    if (LINE_COLORS[name]) {
        return {
            background: LINE_COLORS[name],
            color: name === "U4" ? "#111" : "#fff",
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