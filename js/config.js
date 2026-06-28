export const API_BASE_URLS = {
    bvg: "https://v6.bvg.transport.rest",
    vbb: "https://v6.vbb.transport.rest"
};

export const API_STATUS_TEST_URLS = [
    `${API_BASE_URLS.bvg}/stops?results=1`,
    `${API_BASE_URLS.vbb}/radar?north=52.55&south=52.50&east=13.45&west=13.35&results=1&frames=1`
];

export const MAP_DEFAULT_VIEW = {
    center: [52.52, 13.40],
    zoom: 12
};

export const BERLIN_BOUNDS = {
    minLat: 52.33,
    maxLat: 52.70,
    minLng: 13.05,
    maxLng: 13.80
};

export const VEHICLE_REFRESH_INTERVAL = 30000;
export const VEHICLE_MINIMUM_UPDATE_INTERVAL = 15000;
export const POPUP_REFRESH_INTERVAL = 15000;

export const STATION_MARKER_LIMIT = 200;

export const VEHICLE_ZOOM_THRESHOLD = 14;
export const STATION_ZOOM_THRESHOLD = 14;

export const RADAR_RESULT_LIMITS = {
    highZoom: 1000,
    mediumZoom: 600,
    default: 300
};

export const RADAR_RESULT_ZOOM_LEVELS = {
    high: 16,
    medium: 15
};

export const STATION_RESULTS_LIMIT = 1000;

export const DEPARTURE_REQUEST = {
    results: 20,
    duration: 60,
    displayLimit: 12
};

export const DEPARTURE_FALLBACK_REQUEST = {
    results: 8,
    duration: 30
};

export const HTTP_TIMEOUT = 10000;
export const API_STATUS_TIMEOUT = 6000;
export const API_STATUS_REFRESH_INTERVAL = 60000;