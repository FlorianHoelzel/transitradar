export function createLineBadge(lineName) {
    if (!lineName) {
        return `<span class="line-badge unknown-badge">?</span>`;
    }

    const name = lineName.toString();

    if (name.startsWith("S")) {
        return `<span class="line-badge s-badge">${name}</span>`;
    }

    if (name.startsWith("U")) {
        return `<span class="line-badge u-badge">${name}</span>`;
    }

    if (name.startsWith("M")) {
        return `<span class="line-badge metro-bus-badge">${name}</span>`;
    }

    if (name.startsWith("X")) {
        return `<span class="line-badge express-bus-badge">${name}</span>`;
    }

    if (name.startsWith("N")) {
        return `<span class="line-badge night-bus-badge">${name}</span>`;
    }

    if (name.startsWith("RE") || name.startsWith("RB")) {
        return `<span class="line-badge regional-badge">${name}</span>`;
    }

    if (!isNaN(name[0])) {
        return `<span class="line-badge bus-badge">${name}</span>`;
    }

    return `<span class="line-badge unknown-badge">${name}</span>`;
}