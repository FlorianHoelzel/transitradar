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

    indicator.className = `api-status-indicator ${status}`;
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
    const indicator = document.createElement("div");
    indicator.id = "apiStatusIndicator";
    indicator.className = "api-status-indicator checking";

    indicator.innerHTML = `
        <div class="api-status-dot"></div>

        <div class="api-status-tooltip">
            <strong>API-Status</strong>
            <span>API-Status wird geprüft …</span>
            <small>Antwort wird erwartet</small>
        </div>
    `;

    document.body.appendChild(indicator);

    updateApiStatusIndicator();

    startApiStatusWatcher(updateApiStatusIndicator);
}
