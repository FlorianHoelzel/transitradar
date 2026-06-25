export function createLineBadge(lineName) {
    if (!lineName) {
        return `<span class="line-badge unknown-badge">?</span>`;
    }

    const name = lineName.toString().trim();

    // S-Bahn
    if (name.startsWith("S")) {
        return `<span class="line-badge s-badge">${name}</span>`;
    }

    // U-Bahn
    if (name.startsWith("U")) {
        return `<span class="line-badge u-badge">${name}</span>`;
    }

    // Regionalverkehr
    if (name.startsWith("RE") || name.startsWith("RB")) {
        return `<span class="line-badge regional-badge">${name}</span>`;
    }

    // Fähre
    if (name.startsWith("F")) {
        return `<span class="line-badge ferry-badge">${name}</span>`;
    }

    // ExpressBus
    if (name.startsWith("X")) {
        return `<span class="line-badge express-badge">${name}</span>`;
    }

    // Nachtbus
    if (name.startsWith("N")) {
        return `<span class="line-badge night-badge">${name}</span>`;
    }

    // Metro-Linien (Bus + Tram)
    if (name.startsWith("M")) {
        return `<span class="line-badge metro-badge">${name}</span>`;
    }

    // Normale Buslinien
    if (/^\d+$/.test(name)) {
        return `<span class="line-badge bus-badge">${name}</span>`;
    }

    return `<span class="line-badge unknown-badge">${name}</span>`;
}