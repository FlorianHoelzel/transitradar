# 🚆 TransitRadar

**A modern public transport experience.**

TransitRadar is a fast, interactive web application for exploring public transport in real time. It brings live departures, vehicle positions, route information, and an intuitive map together in one clean experience.

TransitRadar currently serves Berlin, Hamburg, Frankfurt, and Hannover, with support for more cities planned.

> ⚠️ TransitRadar is currently under active development.

![Status](https://img.shields.io/badge/status-active-success)
![Cities](https://img.shields.io/badge/planned_cities-9-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🗺️ Interactive map

- Live vehicle positions
- Smooth vehicle animations
- Clear station details at every zoom level
- Easy map navigation, even in busy areas

### 🚉 Stations

- Search for stations
- Find nearby stations
- Save favorite stations

### ⏱️ Live departures

- Real-time departure information
- Delay and platform information
- Countdown timers
- Automatic updates

### 🚆 Routes

- Route visualization
- Upcoming stops
- Line information
- Vehicle tracking

### 🎨 Modern interface

- Responsive layout
- Dark mode
- Fast and lightweight design

## 🏙️ Cities

| Region | Status |
| --- | --- |
| 🇩🇪 Berlin (VBB) | ✅ Live |
| 🚇 Hamburg (HVV) | ✅ Live |
| 🚈 Frankfurt (RMV) | ✅ Live |
| 🚊 Hannover (GVH) | ✅ Live |
| 🚋 Cologne (VRS) | 📅 Planned |
| 🚉 Rhine-Ruhr (VRR) | 📅 Planned |
| 🚇 Stuttgart (VVS) | 📅 Planned |
| 🚌 Bremen (VBN) | 📅 Planned |
| 🚇 Munich (MVV) | ⏳ Planned, pending data availability |

## Deutschland map

Run `node scripts/dev-server.mjs` and open `http://localhost:4173/db`.
The production Nginx configuration serves the map at `db.transitradar.de`.

The map uses a bundled snapshot of scheduled ICE and regional rail stops
in Germany. It shows ICE stops and regional hubs at country zoom and adds
smaller regional stations when zooming in. S-Bahn and replacement bus
routes are excluded from the station selection.

To refresh the snapshot, download the [long-distance GTFS ZIP](https://download.gtfs.de/germany/fv_free/latest.zip),
the [regional GTFS ZIP](https://download.gtfs.de/germany/rv_free/latest.zip)
and the [Natural Earth countries GeoJSON](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson).
Then run `python tools/generate_db_stations.py <long-distance.zip> <regional.zip> <countries.geojson>`.

## 🔭 Planned

- Favorite lines
- Offline caching
- More cities
- Improved settings
- Better route visualization
- More personalization

## ⚠️ Disclaimer

TransitRadar is an independent project and is **not affiliated with or endorsed by any public transport operator or transport association**.

Real-time information may occasionally be delayed, unavailable, or inaccurate because of upstream data limitations or outages. For official travel information, refer to the relevant transport operator or association.

## ❤️ Contributing

Contributions, ideas, and feedback are welcome. Feel free to open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License.
