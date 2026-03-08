# CityWatch
    is a mobile application that allows users to submit photos of infrastructures of the city that are in need of repair or 
    maintenance. The app uses
    AI to determine the type of issue and severity. 
    There is a heat map that shows how many issues have been reported in a given area. It also has a predictive model that predicts which areas are more risky to have issues based on historical data. 

How it works:

### 1. User Reporting (Frontend)
- Users open the **React Native mobile app** on their device.
- The app uses **Mapbox** to display an interactive map with existing reports.
- When a user spots an infrastructure issue (e.g., a pothole or a broken streetlight), they snap a photo and submit it along with their location.

### 2. AI Analysis (CV Backend)
- The report and image are sent to our **Node.js/Express API**, which routes the image to our **Python Computer Vision service**.
- The AI analyzes the image to automatically determine the **type of issue** and its **severity level**.

### 3. Data Storage & Heat Map
- The classified report is stored in our **Supabase** database.
- The app's frontend fetches this data to populate a **heat map**, showing the concentration of issues in various areas of the city.

### 4. Predictive Modeling
- A separate **predictive model** continuously analyzes historical incident data.
- It calculates and predicts which specific geographic areas are at the highest risk for upcoming infrastructure failures, enabling preventative maintenance.

Monorepo structure:

- frontend/mobile: Expo React Native app (Mapbox)
- backend: Node/Express API

## Run Frontend

From repo root:

- npm start
- npm run ios
- npm run android
- npm run web

Or run directly:

- cd frontend/mobile && npm start

## Run Backend

From repo root:

- npm run backend:start

Or run directly:

- cd backend && node server.js

## CityWatch (City Infrastructure Risk)

Hi everyone — we’re excited to present CityWatch.

Cities rely on roads and infrastructure every day, but damage like potholes and road cracks often goes unnoticed until it becomes dangerous or expensive to repair. Today, inspections are often manual, slow, and reactive. Crack explores how mobile reporting, geospatial storage, computer vision, and simple predictive models can give cities faster visibility so problems are caught earlier.

## Problem

Infrastructure damage spreads quickly. A small crack can turn into a large pothole, increasing repair costs and creating safety risks for drivers, cyclists, and pedestrians. Cities spend billions on maintenance each year but often lack timely, citywide visibility into where problems are developing. By the time issues are reported or discovered, the damage has often already worsened.

## Solution

That’s why we built CityWatch.

CityWatch is a platform that helps cities and communities identify and visualize infrastructure damage across a city. Users submit reports from their phones (photo + location). Reports are stored in a geospatial database and visualized on an interactive map. Aggregated reports are converted into heatmaps that surface high‑risk areas and we run simple predictive models to estimate risk in future windows (30d/90d/365d).

Key user flows:
- User opens the mobile app and views a live map of reports.
- User takes a photo of a crack/pothole and submits a report; the photo + location are uploaded.
- A backend service (Node/Express + Python CV worker) analyzes the photo to classify issue type and estimate severity.
- Reports are persisted in Supabase/Postgres with geospatial columns.
- A heatmap of aggregated grid cells shows current and predicted risk. The UI exposes Now / 30d / 90d / 1y views.

## Demo (what to expect)

- Sign in (Auth0) or continue as anonymous.
- Open the map to see existing reports and the risk heatmap.
- Submit a report (photo + location) and see it appear on the map shortly after submission.
- Toggle the heatmap period to see current vs predicted risk.
- View top risk zones and a small report list (your reports + recent reports).

## Tech stack

- Frontend (mobile): Expo / React Native + TypeScript
    - Map: @rnmapbox/maps (Mapbox integration)
    - Auth: Auth0 (react-native-auth0)
    - Storage: Supabase Storage for images (public URLs)
- Backend: Node.js + Express
    - Supabase client for DB access
    - REST endpoints for reports, stats, heatmap, and predictions
- Computer Vision & Predictions: Python services (scikit-learn / keras) used to analyze images and generate grid-level predictions
- Database: Supabase (Postgres) with PostGIS/geospatial support for storing report locations and heatmap tiles
- Dev tooling: Expo, npm, Node 18+, Python 3.10+

## Repo layout (summary)

- frontend/ — Expo React Native app (mobile client)
    - app/ — screens and components
    - lib/ — client-side API helpers
- backend/ — Node/Express server & small CV prediction server
    - server.js — REST endpoints
    - cv_predict_server.py — Python prediction helpers (used for generating heatmap tiles)
- model training and prediction scripts under backend/prediction and backend/CV Classification

## How to build & run (local development)

Prereqs
- Node 18+ and npm
- Python 3.10+ (for optional CV services)
- Expo CLI (optional: `npm install -g expo-cli`)
- A Supabase project or local Postgres with the expected schema if you want full end-to-end

1) Backend

From repo root or the backend folder:

```bash
cd backend
npm install
# copy .env.example -> .env and set SUPABASE credentials (URL, anon key) and PORT if desired
node server.js
```

The server should start on port 3001 by default. Check `http://localhost:3001/api/stats` to confirm the stats endpoint is reachable.

2) Frontend (Expo)

From repo root or the frontend folder:

```bash
cd frontend
npm install
# ensure environment variables are provided to the Expo runtime:
# set EXPO_PUBLIC_API_URL to the backend host your device can reach
# - For iOS simulator: http://localhost:3001
# - For Android emulator: http://10.0.2.2:3001
# - For an actual device: http://<your.machine.ip>:3001

expo start
```

Open the app in the simulator/emulator or on your device via Expo Go. If you run into `TypeError: Network request failed` for stats/heatmap, confirm `EXPO_PUBLIC_API_URL` is set correctly for your device (emulators handle localhost differently).

3) Computer Vision / Predictions (optional)

If you want to run the Python CV/prediction services locally:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# run the cv prediction server if needed
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
