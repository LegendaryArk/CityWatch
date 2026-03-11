<!--
    CityWatch README
    Consolidated, professional, and non-duplicated.
-->

# CityWatch — City Infrastructure Risk

CityWatch helps cities and communities detect, visualize, and prioritize infrastructure damage (potholes, cracks, etc.) using mobile reports, simple computer vision, geospatial storage, and predictive heatmaps.

Table of contents
- Project overview
- Features
- Tech stack
- Architecture & data flow
- Repo layout
- Getting started (build & run)
- Environment variables
- Troubleshooting
- Contributing & license

## Project overview

Cities need timely visibility into road and infrastructure damage. CityWatch enables residents and field workers to report issues with a photo and location. Reports are stored in a geospatial database, analyzed with a light-weight CV pipeline to classify issue type and estimate severity, and aggregated into grid-based heatmaps with short-term predictions (30d, 90d, 365d) to help prioritize maintenance.

## Features

- Mobile reporting (photo + GPS) via an Expo React Native app
- Automatic image analysis (type & severity) via a Python CV worker
- Geospatial storage of reports and aggregated heatmap tiles (PostGIS)
- Interactive Mapbox map with heatmap overlay and top-risk zones
- Simple predictive scoring for future-risk windows
- User report list (personal + recent), stats, and issue-type breakdowns

## Tech stack

- Frontend: Expo / React Native (TypeScript), @rnmapbox/maps
- Backend: Node.js + Express, Supabase client
- CV & predictions: Python (scikit-learn, Keras/TensorFlow where applicable)
- Database: Supabase (Postgres) with PostGIS for geospatial queries
- Auth: Auth0 (react-native-auth0)

## Architecture & data flow

1. Mobile client uploads a photo and location to the backend.
2. The backend stores the report, uploads the photo to Supabase storage, and enqueues or forwards the image to the CV process.
3. CV service returns classification and severity; backend persists metadata to the database.
4. A prediction/aggregation job turns reports into grid tiles (heatmap_tiles) and computes short-term predictions.
5. Frontend fetches stats, reports, and heatmap tiles and renders them on the map.

## Repo layout

- frontend/
    - app/ — screens and UI
    - lib/ — API helpers (client-side)
- backend/
    - server.js — main REST API
    - cv_predict_server.py — Python CV/prediction helper
    - prediction/ — scripts and training artifacts

## Getting started (local development)

Prerequisites
- Node 18+ and npm
- Python 3.10+ (for optional CV services)
- Expo CLI (optional: `npm install -g expo-cli`)
- Supabase project or local Postgres with PostGIS

1) Backend

```bash
cd backend
npm install
# create .env from .env.example and set Supabase URL + anon key (see `backend/.env.example` if present)
node server.js
```

By default the server listens on port 3001. Verify with:

```bash
curl -i http://localhost:3001/api/stats
```

2) Frontend (Expo)

```bash
cd frontend
npm install
# Make sure the Expo runtime can reach the backend. Set EXPO_PUBLIC_API_URL appropriately:
# - iOS simulator: http://localhost:3001
# - Android emulator: http://10.0.2.2:3001
# - Physical device: http://<your.machine.ip>:3001

expo start
```

Open the app in the simulator/emulator or on your device. When running on emulators/devices, confirm the app can reach the backend host (see Troubleshooting).

3) Computer Vision & predictions (optional)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python cv_predict_server.py
```

This runs the simple CV/prediction server used for generating heatmap tiles (if you use it locally).

## Environment variables

- EXPO_PUBLIC_API_URL — Backend base URL used by the mobile client (must be reachable from device)
- EXPO_PUBLIC_MAPBOX_TOKEN — Mapbox token for map tiles
- EXPO_PUBLIC_SUPABASE_URL — Supabase project URL (for direct client storage access)
- EXPO_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key
- Any other backend-specific keys (see `backend/.env.example`)

## Troubleshooting

- "TypeError: Network request failed" — the mobile runtime cannot reach the backend. Common fixes:
    - Android emulator: use `http://10.0.2.2:3001`
    - iOS simulator: `http://localhost:3001`
    - Physical device: use your machine's LAN IP (e.g. `http://192.168.1.42:3001`) and ensure firewall allows connections.
- If stats or reports are empty, verify the backend `/api/stats` and `/api/reports` endpoints return data from the server (curl them locally).
- If heatmap tiles look stale, ensure the prediction/aggregation job ran and updated `heatmap_tiles`.
- If image uploads fail, check Supabase storage configuration and credentials.

## Contributing

Contributions welcome. Open an issue to discuss changes or submit a PR. Include a brief description of the UX and any DB migrations.

## License

MIT License — see LICENSE file.
