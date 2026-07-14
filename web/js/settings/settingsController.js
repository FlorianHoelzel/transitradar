import { CITY_CONFIG } from "../config.js";
import {
    DEFAULT_SETTINGS,
    getSettings,
    resetSettings,
    updateSetting
} from "./settingsStore.js";

const MAP_BRIGHTNESS = {
    dim: 0.65,
    balanced: 0.82,
    bright: 1
};

function createSelectSetting({ id, label, description, options }) {
    const optionsHtml = options
        .map(option => `<option value="${option.value}">${option.label}</option>`)
        .join("");

    return `
        <label class="settings-field" for="${id}">
            <span class="settings-field-copy">
                <strong>${label}</strong>
                <span>${description}</span>
            </span>

            <select id="${id}" data-setting-control>
                ${optionsHtml}
            </select>
        </label>
    `;
}

function createToggleSetting({ id, label, description }) {
    return `
        <label class="settings-field settings-toggle-field" for="${id}">
            <span class="settings-field-copy">
                <strong>${label}</strong>
                <span>${description}</span>
            </span>

            <span class="settings-switch">
                <input id="${id}" type="checkbox" data-setting-control>
                <span class="settings-switch-track" aria-hidden="true"></span>
            </span>
        </label>
    `;
}

function createSettingsOverlay() {
    const overlay = document.createElement("div");

    overlay.id = "settingsOverlay";
    overlay.className = "settings-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.inert = true;
    overlay.innerHTML = `
        <section class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
            <div class="settings-header">
                <div>
                    <div class="settings-kicker">Preferences</div>
                    <h2 id="settingsTitle">Settings</h2>
                </div>

                <button id="settingsClose" class="settings-close" type="button" aria-label="Close settings">×</button>
            </div>

            <div class="settings-content">
                ${createSelectSetting({
                    id: "stationDensitySetting",
                    label: "Station density",
                    description: "Choose how many stations appear at each zoom level.",
                    options: [
                        { value: "low", label: "Low" },
                        { value: "balanced", label: "Balanced" },
                        { value: "high", label: "High" }
                    ]
                })}

                ${CITY_CONFIG.supportsLiveVehicles ? `
                    ${createToggleSetting({
                        id: "showVehiclesSetting",
                        label: "Live vehicles",
                        description: "Show live vehicle positions on the map."
                    })}

                    ${createToggleSetting({
                        id: "smoothVehicleMovementSetting",
                        label: "Smooth movement",
                        description: "Animate vehicles between live position updates."
                    })}
                ` : ""}

                ${createSelectSetting({
                    id: "mapBrightnessSetting",
                    label: "Map brightness",
                    description: "Adjust the visibility of streets and map labels.",
                    options: [
                        { value: "dim", label: "Dim" },
                        { value: "balanced", label: "Balanced" },
                        { value: "bright", label: "Bright" }
                    ]
                })}

                ${createSelectSetting({
                    id: "departureTimeDisplaySetting",
                    label: "Departure times",
                    description: "Choose how upcoming departures are displayed.",
                    options: [
                        { value: "countdown", label: "Countdown" },
                        { value: "clock", label: "Clock time" },
                        { value: "both", label: "Both" }
                    ]
                })}
            </div>

            <div class="settings-footer">
                <button id="settingsReset" class="settings-reset" type="button">Reset defaults</button>
            </div>
        </section>
    `;

    document.body.appendChild(overlay);
    return overlay;
}

function syncControls(overlay, settings) {
    overlay.querySelector("#stationDensitySetting").value = settings.stationDensity;
    const showVehiclesControl = overlay.querySelector("#showVehiclesSetting");
    const smoothMovementControl = overlay.querySelector("#smoothVehicleMovementSetting");

    if (showVehiclesControl) {
        showVehiclesControl.checked = settings.showVehicles;
    }

    if (smoothMovementControl) {
        smoothMovementControl.checked = settings.smoothVehicleMovement;
    }
    overlay.querySelector("#mapBrightnessSetting").value = settings.mapBrightness;
    overlay.querySelector("#departureTimeDisplaySetting").value = settings.departureTimeDisplay;
}

function applyVisualSettings(settings) {
    document.documentElement.style.setProperty(
        "--map-tile-brightness",
        MAP_BRIGHTNESS[settings.mapBrightness]
    );
}

export function setupSettings() {
    const settingsButton = document.getElementById("settingsButton");
    const overlay = createSettingsOverlay();
    const closeButton = overlay.querySelector("#settingsClose");
    const resetButton = overlay.querySelector("#settingsReset");

    const controlKeys = {
        stationDensitySetting: "stationDensity",
        showVehiclesSetting: "showVehicles",
        smoothVehicleMovementSetting: "smoothVehicleMovement",
        mapBrightnessSetting: "mapBrightness",
        departureTimeDisplaySetting: "departureTimeDisplay"
    };

    function openSettings() {
        syncControls(overlay, getSettings());
        overlay.inert = false;
        overlay.setAttribute("aria-hidden", "false");
        overlay.classList.add("open");
        closeButton.focus();
    }

    function closeSettings() {
        overlay.classList.remove("open");
        overlay.inert = true;
        overlay.setAttribute("aria-hidden", "true");
        settingsButton?.focus();
    }

    applyVisualSettings(getSettings());
    syncControls(overlay, getSettings());

    overlay.querySelectorAll("[data-setting-control]").forEach(control => {
        control.addEventListener("change", () => {
            const key = controlKeys[control.id];
            const value = control.type === "checkbox"
                ? control.checked
                : control.value;

            const settings = updateSetting(key, value);
            applyVisualSettings(settings);
        });
    });

    settingsButton?.addEventListener("click", openSettings);
    closeButton.addEventListener("click", closeSettings);

    resetButton.addEventListener("click", () => {
        const settings = resetSettings();

        syncControls(overlay, settings);
        applyVisualSettings(settings);
    });

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeSettings();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && overlay.classList.contains("open")) {
            closeSettings();
        }
    });

    window.addEventListener("transitRadarSettingsChanged", event => {
        applyVisualSettings(event.detail?.settings || DEFAULT_SETTINGS);
    });
}
