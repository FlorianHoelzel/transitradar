function requiredEnvironmentVariable(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

export const config = {
    port: Number(process.env.PORT || 3000),
    geofoxBaseUrl: process.env.GEOFOX_BASE_URL || "https://gti.geofox.de/gti/public",
    geofoxUser: requiredEnvironmentVariable("GEOFOX_USER"),
    geofoxPassword: requiredEnvironmentVariable("GEOFOX_PASSWORD"),
    geofoxApiVersion: Number(process.env.GEOFOX_API_VERSION || 63),
    minimumRequestIntervalMs: Number(process.env.GEOFOX_REQUEST_INTERVAL_MS || 1100),
    allowedOrigin: process.env.ALLOWED_ORIGIN || "https://hamburg.transitradar.de"
};
