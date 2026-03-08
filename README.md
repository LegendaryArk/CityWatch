# CityWatch
    is a mobile application that allows users to submit photos of infrastructures of the city that are in need of repair or maintenance. The app uses
    AI to determine the type of issue and severity. There is a heat map that shows how many issues have been reported in a given area. It also has a predictive model that predicts which areas are more risky to have issues based on historical data. 

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
