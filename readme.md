## Repository layout

TransitRadar uses one shared frontend and one isolated API service per transport
provider:

```text
web/                    Shared landing, status, and city frontend
web/js/config.js        Hostname-based city configuration
deploy/nginx.conf       Routing for the shared frontend image
services/hvv-api/       Private Geofox adapter for Hamburg
services/rmv-api/       Private HAFAS adapter for Frankfurt
docker-compose.yaml     VBB API and cache stack
Dockerfile              Shared frontend image used by every website
```

All website applications in Coolify build the root `Dockerfile`. A frontend
change is therefore deployed consistently to the landing page, status page,
Berlin, Hamburg, Frankfurt, and future city sites. Provider credentials and API-specific
normalization live only in `services/<provider>-api/`.

To add another city, add its public configuration to `web/js/config.js`, add an
Nginx hostname mapping to `deploy/nginx.conf`, and create a separate provider
adapter only when its upstream API differs from an existing adapter.

## Local preview

Run the dependency-free preview server from the repository root:

```powershell
node scripts/dev-server.mjs
```

Then open `http://localhost:4173/?city=frankfurt`. The preview server proxies the
production provider API through localhost, so the complete frontend works
without changing API CORS settings or deploying to Coolify.

## Umami analytics

TransitRadar includes an optional self-hosted Umami setup in
`deploy/umami-compose.yaml`. Deploy that Compose file as its own Coolify
application and configure:

- `UMAMI_DB_PASSWORD`: a long random URL-safe database password
- `UMAMI_APP_SECRET`: a separate long random application secret

Attach a domain such as `stats.transitradar.de` to the Umami service on port
`3000`. Log in with the initial credentials `admin` / `umami`, change the
password immediately, and add TransitRadar as a website.

Then add these build variables to every Coolify website application that builds
the root `Dockerfile`:

- `UMAMI_SCRIPT_URL=https://stats.transitradar.de/script.js`
- `UMAMI_WEBSITE_ID=<website ID shown by Umami>`
- `UMAMI_DOMAINS=transitradar.de,berlin.transitradar.de,hamburg.transitradar.de,frankfurt.transitradar.de,status.transitradar.de`

The tracker is injected into every built HTML page only when both
`UMAMI_SCRIPT_URL` and `UMAMI_WEBSITE_ID` are present. It respects browser Do
Not Track settings and collects Core Web Vitals. Local previews remain
untracked by default.

![Status](https://img.shields.io/badge/status-active-success)
![Cities](https://img.shields.io/badge/planned_cities-9-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-yellow)

# 🚆 TransitRadar

**A modern public transport experience.**

TransitRadar is a fast, modern and interactive web application for exploring public transport in real time. It combines live departures, vehicle positions, route information and an intuitive map interface into one clean experience.

The project is built with scalability in mind. While the current focus is on Berlin, TransitRadar is designed to support multiple cities through official public transport APIs.

> ⚠️ TransitRadar is currently under active development.

---

# ✨ Features

## 🗺️ Interactive Map

- Interactive map powered by Leaflet
- Live vehicle positions
- Smooth vehicle animations
- Zoom-dependent station rendering
- Station clustering & performance optimizations

## 🚉 Stations

- Search for stations
- Nearby stations
- Favorite stations

## ⏱️ Live Departures

- Real-time departures
- Delay information
- Platform information
- Countdown timers
- Automatic refresh

## 🚆 Routes

- Route visualization
- Next stopovers
- Line information
- Vehicle tracking

## 🎨 Modern UI

- Responsive layout
- Dark mode
- Glassmorphism-inspired design
- Fast and lightweight

## ⚙️ Planned

- Favorite lines
- Offline cache
- Multiple cities
- Improved settings
- Better route visualization
- More personalization

---

# 🏙️ Cities

TransitRadar is designed around a modular adapter architecture.

Adding a new city should only require implementing a new API adapter while the rest of the application remains unchanged.

| Region | Status |
|---------|--------|
| 🇩🇪 Berlin (VBB) | ✅ Live |
| 🚇 Hamburg (HVV) | ✅ Live |
| 🚈 Frankfurt (RMV) | ✅ Live |
| 🚋 Cologne (VRS) | 📅 Planned |
| 🚉 Rhine-Ruhr (VRR) | 📅 Planned |
| 🚊 Hanover (GVH) | 📅 Planned |
| 🚇 Stuttgart (VVS) | 📅 Planned |
| 🚍 Bremen (VBN) | 📅 Planned |
| 🚇 Munich (MVV) | ⏳ Planned (API availability pending) |

---

# 🛠️ Tech Stack

- HTML
- CSS
- JavaScript (ES Modules)
- Leaflet.js

### APIs

TransitRadar aims to use official public transport APIs whenever possible.

Examples include:

- **VBB** – HAFAS REST API
- **HVV** – Geofox GTI API
- **RMV** – HAFAS REST API
- **VRS** – TRIAS + GTFS-Realtime
- **VRR** – GTFS-Realtime + Open Data
- **GVH** – TRIAS / Connect API
- **VVS** – TRIAS + GTFS-Realtime (MobiData BW)
- **VBN** – GTFS + GTFS-Realtime
- **MVV** – TRIAS *(when publicly available)*

---


# ⚠️ Disclaimer

TransitRadar is an independent project and is **not affiliated with or endorsed by any public transport operator or transport association**.

While every effort is made to provide accurate information, real-time data may occasionally be delayed, unavailable or inaccurate due to API limitations or outages.

For official travel information, please refer to the respective transport operator or transport association.

---

# ❤️ Contributing

Contributions, ideas and feedback are always welcome.

Feel free to open an issue or submit a pull request.

---

# 📄 License

This project is licensed under the MIT License.
