function requiredEnvironmentVariable(name) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

export const config = {
    port: Number(process.env.PORT || 3000),
    rmvBaseUrl: (process.env.RMV_BASE_URL || "https://www.rmv.de/hapi").replace(/\/$/u, ""),
    rmvAccessId: requiredEnvironmentVariable("RMV_ACCESS_ID"),
    requestTimeoutMs: Number(process.env.RMV_REQUEST_TIMEOUT_MS || 10000),
    minimumRequestIntervalMs: Number(process.env.RMV_REQUEST_INTERVAL_MS || 6100),
    allowedOrigins: new Set([
        process.env.ALLOWED_ORIGIN,
        ...(process.env.ALLOWED_ORIGINS || "").split(","),
        "http://localhost:4173",
        "https://frankfurt.transitradar.de",
        "https://status.transitradar.de"
    ].filter(Boolean).map(origin => origin.trim()))
};
