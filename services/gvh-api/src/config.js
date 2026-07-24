function requiredEnvironmentVariable(name) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

export const config = {
    port: Number(process.env.PORT || 3000),
    triasBaseUrl: (process.env.GVH_TRIAS_BASE_URL || "https://v4-api.efa.de")
        .replace(/\/$/u, ""),
    requestorRef: requiredEnvironmentVariable("GVH_TRIAS_REQUESTOR_REF"),
    requestTimeoutMs: Number(process.env.GVH_TRIAS_REQUEST_TIMEOUT_MS || 10000),
    minimumRequestIntervalMs: Number(process.env.GVH_TRIAS_REQUEST_INTERVAL_MS || 150),
    dailyRequestLimit: Number(process.env.GVH_TRIAS_DAILY_LIMIT || 10000),
    allowedOrigins: new Set([
        process.env.ALLOWED_ORIGIN,
        ...(process.env.ALLOWED_ORIGINS || "").split(","),
        "http://localhost:4173",
        "https://hannover.transitradar.de",
        "https://status.transitradar.de"
    ].filter(Boolean).map(origin => origin.trim()))
};
