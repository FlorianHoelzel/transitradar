# TransitRadar GVH API

Private TRIAS adapter for the Hannover TransitRadar site. It translates the
Connect Fahrplanauskunft OpenService API into the JSON contract used by the
TransitRadar frontend while keeping the `RequestorRef` on the server.

## Runtime configuration

```text
GVH_TRIAS_REQUESTOR_REF       Required TRIAS RequestorRef
GVH_TRIAS_BASE_URL            Defaults to https://v4-api.efa.de
GVH_TRIAS_REQUEST_TIMEOUT_MS  Defaults to 10000
GVH_TRIAS_REQUEST_INTERVAL_MS Defaults to 150
GVH_TRIAS_DAILY_LIMIT         Defaults to 10000
ALLOWED_ORIGINS               Comma-separated browser origins
PORT                          Defaults to 3000
```

The RequestorRef is a runtime-only secret. Do not expose it as a Docker build
argument or commit it to the repository.

## Implemented frontend endpoints

```text
GET /healthz
GET /stations
GET /locations
GET /locations/nearby
GET /stops/:id/departures
GET /journeys
GET /trips/:id
GET /radar
```

TRIAS does not provide vehicle coordinates through this access, so `/radar`
returns an empty movement list. Trip details are retained briefly from
departure and journey responses because TRIAS includes their call sequences in
those responses.

Run locally with `npm start` from this directory. The start script loads the
ignored `.env` file when present.
