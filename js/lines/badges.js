import { getBadgeStyle } from "./lineColors.js";

const LONG_DISTANCE_BADGE_PATTERN = /^(ICE|ECE|IC|EC|EN|NJ|RJX|RJ|TGV)\s+.+$/i;

export function createLineBadge(lineName) {
    if (!lineName) {
        return `<span class="line-badge unknown-badge">?</span>`;
    }

    const name = lineName.toString().trim();

    const style = getBadgeStyle(name);
    const badgeClass = LONG_DISTANCE_BADGE_PATTERN.test(name)
        ? "line-badge long-distance-badge"
        : "line-badge";

    return `
        <span
            class="${badgeClass}"
            style="
                background: ${style.background};
                color: ${style.color};
                border: ${style.border};
            "
        >
            ${name}
        </span>
    `;
}
