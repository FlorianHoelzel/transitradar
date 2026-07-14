# TransitRadar RMV API

Private HAFAS adapter for the Frankfurt TransitRadar site. It exposes frontend-
compatible HTTP responses while keeping the RMV access ID on the server.

## Runtime configuration

```text
RMV_ACCESS_ID             Required RMV API access ID
RMV_BASE_URL              Defaults to https://www.rmv.de/hapi
RMV_REQUEST_TIMEOUT_MS    Defaults to 10000
RMV_REQUEST_INTERVAL_MS   Defaults to 6100
ALLOWED_ORIGINS           Comma-separated browser origins
PORT                      Defaults to 3000
```

The access ID is a runtime-only secret. Do not expose it as a Docker build
argument or commit it to the repository.

The default request interval keeps a single adapter instance within RMV's
published limit of 600 requests per hour. Multiple replicas must coordinate
their combined upstream request rate.

## Implemented frontend endpoints

```text
GET /healthz
GET /locations
```

Run locally with `npm start` from this directory. The start script loads the
ignored `.env` file when present.
