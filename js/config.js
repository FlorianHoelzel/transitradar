export const API_BASE_URLS = {
    vbb: "https://api.transitradar.de"
};

export const HTTP_CONFIG = {
    timeout: 10000
};

export const API_STATUS_CONFIG = {
    timeout: 2500,
    refreshInterval: 60000,
    primaryTestUrls: [
        `${API_BASE_URLS.vbb}/locations?query=Berlin&results=1&stops=true&addresses=false&poi=false`,
        `${API_BASE_URLS.vbb}/radar?north=52.55&south=52.50&east=13.45&west=13.35&results=1&frames=1`
    ]
};

export const MAP_CONFIG = {
    defaultCenter: [52.52, 13.40],
    defaultZoom: 12
};

export const BERLIN_BOUNDS = {
    minLat: 52.33,
    maxLat: 52.70,
    minLng: 13.05,
    maxLng: 13.80
};

export const STATION_CONFIG = {
    apiResultsLimit: 1000,
    requestTimeout: 15000,
    nearbyGridSize: 8,
    nearbyDistance: 4500,
    searchQueries: ["Berlin", "S", "U", "Tram", "Bus", "Bhf"],
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
    requestTimeout: 2500,
    zoomThreshold: 16,
    animationDuration: 16000,
    radarResultLimits: {
        highZoom: 1000,
        mediumZoom: 600,
        default: 300
    },
    radarZoomLevels: {
        high: 16,
        medium: 15
    }
};

export const ROUTE_STYLE = {
    glowWeight: 16,
    glowOpacity: 0.18,
    lineWeight: 7,
    lineOpacity: 1
};
