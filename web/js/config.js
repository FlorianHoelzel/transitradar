const CITY_CONFIGS = {
    berlin: {
        id: "berlin",
        name: "Berlin",
        network: "VBB",
        hostname: "berlin.transitradar.de",
        apiBaseUrl: "https://api.transitradar.de",
        mapCenter: [52.52, 13.40],
        mapZoom: 12,
        importantStationMinScore: 6,
        vehicleGridStrategy: "grid",
        vehicleRequestTimeout: 2500,
        surfaceTransitLabel: "Bus / Tram",
        bounds: {
            minLat: 52.33,
            maxLat: 52.70,
            minLng: 13.05,
            maxLng: 13.80
        },
        stationSearchQueries: ["Berlin", "S", "U", "Tram", "Bus", "Bhf"],
        officialSources: [
            { label: "vbb.de", url: "https://www.vbb.de" },
            { label: "bvg.de", url: "https://www.bvg.de" }
        ],
        dataSourceText: "VBB-related public transport endpoints",
        affiliationText: "BVG, VBB or Deutsche Bahn"
    },
    hamburg: {
        id: "hamburg",
        name: "Hamburg",
        network: "HVV",
        hostname: "hamburg.transitradar.de",
        apiBaseUrl: "https://api-hamburg.transitradar.de",
        apiHealthCheckPath: "/healthz",
        mapCenter: [53.5511, 9.9937],
        mapZoom: 12,
        importantStationMinScore: 3,
        vehicleGridStrategy: "single-request",
        vehicleRequestTimeout: 15000,
        surfaceTransitLabel: "Bus / Ferry",
        bounds: {
            minLat: 53.35,
            maxLat: 53.75,
            minLng: 9.65,
            maxLng: 10.35
        },
        stationSearchQueries: ["Hamburg", "S", "U", "Bus", "Fähre", "Bahnhof"],
        officialSources: [
            { label: "hvv.de", url: "https://www.hvv.de" }
        ],
        dataSourceText: "Geofox GTI data supplied for the HVV network",
        affiliationText: "HVV, Hamburger Hochbahn or the participating transport operators"
    }
};

const LOCAL_DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

function getCityIdFromHostname(hostname) {
    if (LOCAL_DEV_HOSTNAMES.has(hostname)) {
        const requestedCity = new URLSearchParams(window.location.search).get("city");

        if (CITY_CONFIGS[requestedCity]) {
            return requestedCity;
        }
    }

    const matchingCity = Object.values(CITY_CONFIGS).find(city => {
        return hostname === city.hostname || hostname.startsWith(`${city.id}-`);
    });

    return matchingCity?.id ?? "berlin";
}

export const CITY_CONFIG = CITY_CONFIGS[
    getCityIdFromHostname(window.location.hostname)
];

export const API_BASE_URL = LOCAL_DEV_HOSTNAMES.has(window.location.hostname)
    ? `/api/${CITY_CONFIG.id}`
    : CITY_CONFIG.apiBaseUrl;
export const CITY_BOUNDS = CITY_CONFIG.bounds;

export const HTTP_CONFIG = {
    timeout: 10000
};

export const API_STATUS_CONFIG = {
    timeout: 2500,
    refreshInterval: 60000,
    primaryTestUrls: CITY_CONFIG.apiHealthCheckPath
        ? [`${API_BASE_URL}${CITY_CONFIG.apiHealthCheckPath}`]
        : [
            `${API_BASE_URL}/locations?query=${encodeURIComponent(CITY_CONFIG.name)}&results=1&stops=true&addresses=false&poi=false`,
            `${API_BASE_URL}/radar?north=${CITY_BOUNDS.maxLat}&south=${CITY_BOUNDS.minLat}&east=${CITY_BOUNDS.maxLng}&west=${CITY_BOUNDS.minLng}&results=1&frames=1`
        ]
};

export const MAP_CONFIG = {
    defaultCenter: CITY_CONFIG.mapCenter,
    defaultZoom: CITY_CONFIG.mapZoom
};

export const STATION_CONFIG = {
    apiResultsLimit: 1000,
    requestTimeout: 15000,
    importantStationMinScore: CITY_CONFIG.importantStationMinScore,
    nearbyGridSize: 8,
    nearbyDistance: 4500,
    searchQueries: CITY_CONFIG.stationSearchQueries,
    markerLimit: 1000,
    zoomLevels: {
        importantRapidTransit: 12,
        rapidTransit: 13,
        surfaceTransit: 15,
        allStations: 16
    },
    markerLimits: {
        importantRapidTransit: 180,
        rapidTransit: 220,
        surfaceTransit: 380,
        allStations: 1000
    }
};

export const SEARCH_CONFIG = {
    minCharacters: 2,
    maxResults: 10,
    flyToZoom: 16,
    flyToDuration: 0.3
};

export const DEPARTURE_CONFIG = {
    requestResults: 20,
    requestDuration: 60,
    requestTimeout: 3000,
    firstRenderTimeout: 700,
    displayLimit: 12,
    fallbackResults: 8,
    fallbackDuration: 30,
    staleGraceMs: 60000,
    popupRefreshInterval: 15000
};

export const VEHICLE_CONFIG = {
    refreshInterval: 30000,
    minimumUpdateInterval: 15000,
    requestTimeout: CITY_CONFIG.vehicleRequestTimeout,
    zoomThreshold: 16,
    animationDuration: 16000,
    radarResultLimits: {
        highZoom: 1000,
        mediumZoom: 600,
        default: 300
    },
    radarZoomLevels: {
        high: 14,
        medium: 13
    },
    selectedLineGridSize: 4,
    selectedLineGridConcurrency: 4
};

export const ROUTE_STYLE = {
    glowWeight: 16,
    glowOpacity: 0.18,
    lineWeight: 7,
    lineOpacity: 1
};
