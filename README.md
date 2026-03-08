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
