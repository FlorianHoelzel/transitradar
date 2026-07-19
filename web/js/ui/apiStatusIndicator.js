import {
    getApiStatus,
    getLastCheckedAt,
    startApiStatusWatcher
} from "../api/apiStatus.js";

function getTooltipText(status) {
    if (status === "online") {
        return "API ist erreichbar.";
    }

    if (status === "offline") {
        return "API ist derzeit nicht verfügbar.";
    }

    return "API-Status wird geprüft …";
}

function updateApiStatusIndicator() {
    const indicator = document.getElementById("apiStatusIndicator");

    if (!indicator) {
        return;
    }

    const status = getApiStatus();
    const lastCheckedAt = getLastCheckedAt();

    indicator.classList.remove("checking", "online", "offline");
    indicator.classList.add(status);
    indicator.setAttribute("aria-label", getTooltipText(status));

    indicator.querySelector(".api-status-tooltip").innerHTML = `
        <strong>API-Status</strong>
        <span>${getTooltipText(status)}</span>
        ${
            lastCheckedAt
                ? `<small>Zuletzt geprüft: ${lastCheckedAt}</small>`
                : `<small>Antwort wird erwartet</small>`
        }
    `;
}

export function createApiStatusIndicator() {
    const indicator = document.createElement("button");
    indicator.id = "apiStatusIndicator";
    indicator.className = "api-status-indicator checking";
    indicator.type = "button";
    indicator.setAttribute("aria-expanded", "false");

    indicator.innerHTML = `
        <div class="api-status-dot"></div>

        <div class="api-status-tooltip">
            <strong>API-Status</strong>
            <span>API-Status wird geprüft …</span>
            <small>Antwort wird erwartet</small>
        </div>
    `;

    document.body.appendChild(indicator);

    const closeTooltip = () => {
        indicator.classList.remove("open");
        indicator.setAttribute("aria-expanded", "false");
    };

    indicator.addEventListener("click", event => {
        event.stopPropagation();

        const isOpen = indicator.classList.toggle("open");
        indicator.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", closeTooltip);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeTooltip();
        }
    });

    updateApiStatusIndicator();

    startApiStatusWatcher(updateApiStatusIndicator);
}
