# TransitRadar HVV API

Private Geofox GTI adapter for the Hamburg TransitRadar site. It exposes the
same HTTP shapes consumed by the shared frontend while keeping the Geofox
credentials and request signatures on the server.

## Runtime configuration

```text
GEOFOX_USER                 Required Geofox application ID
GEOFOX_PASSWORD             Required Geofox password
GEOFOX_BASE_URL             Defaults to https://gti.geofox.de/gti/public
GEOFOX_API_VERSION          Defaults to 63
GEOFOX_REQUEST_INTERVAL_MS  Defaults to 1100
ALLOWED_ORIGIN              Defaults to https://hamburg.transitradar.de
PORT                        Defaults to 3000
```

The user and password are runtime-only secrets. Do not expose them as build
arguments or commit them to the repository.

## Implemented frontend endpoints

```text
GET /healthz
GET /stations
GET /locations
GET /locations/nearby
GET /stops/:id/departures
GET /radar
```

Trip-course and route-geometry support will be added after the first live
Geofox response fixtures have been captured and verified.
