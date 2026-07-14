function normalizeLineName(line) {
    return String(line || "").trim();
}

export function isSuburbanLine(line) {
    return /^S\s*\d+$/iu.test(normalizeLineName(line));
}

export function isSubwayLine(line) {
    return /^U\s*\d+$/iu.test(normalizeLineName(line));
}
