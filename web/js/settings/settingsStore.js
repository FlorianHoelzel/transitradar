const STORAGE_KEY = "transitRadarSettings";

export const DEFAULT_SETTINGS = Object.freeze({
    stationDensity: "balanced",
    showVehicles: true,
    smoothVehicleMovement: true,
    mapBrightness: "balanced",
    departureTimeDisplay: "both"
});

const ALLOWED_VALUES = {
    stationDensity: new Set(["low", "balanced", "high"]),
    showVehicles: new Set([true, false]),
    smoothVehicleMovement: new Set([true, false]),
    mapBrightness: new Set(["dim", "balanced", "bright"]),
    departureTimeDisplay: new Set(["countdown", "clock", "both"])
};

function sanitizeSettings(settings = {}) {
    return Object.fromEntries(
        Object.entries(DEFAULT_SETTINGS).map(([key, defaultValue]) => {
            const value = settings[key];

            return [
                key,
                ALLOWED_VALUES[key].has(value) ? value : defaultValue
            ];
        })
    );
}

function loadSettings() {
    try {
        const storedSettings = localStorage.getItem(STORAGE_KEY);

        return storedSettings
            ? sanitizeSettings(JSON.parse(storedSettings))
            : { ...DEFAULT_SETTINGS };
    } catch (error) {
        console.warn("Failed to load settings:", error);
        return { ...DEFAULT_SETTINGS };
    }
}

let settings = loadSettings();

function saveSettings() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.warn("Failed to save settings:", error);
    }
}

function emitSettingsChanged(changedKey = null) {
    window.dispatchEvent(new CustomEvent("transitRadarSettingsChanged", {
        detail: {
            settings: getSettings(),
            changedKey
        }
    }));
}

export function getSettings() {
    return { ...settings };
}

export function updateSetting(key, value) {
    if (!ALLOWED_VALUES[key]?.has(value) || settings[key] === value) {
        return getSettings();
    }

    settings = {
        ...settings,
        [key]: value
    };

    saveSettings();
    emitSettingsChanged(key);

    return getSettings();
}

export function resetSettings() {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings();
    emitSettingsChanged("reset");

    return getSettings();
}

export function getStationDensityZoomOffset() {
    if (settings.stationDensity === "low") {
        return -1;
    }

    if (settings.stationDensity === "high") {
        return 3;
    }

    return 0;
}

export function getImportantStationScoreOffset() {
    return settings.stationDensity === "low" ? 3 : 0;
}
