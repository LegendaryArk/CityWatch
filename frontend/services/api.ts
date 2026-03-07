// app/services/api.ts
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';

const API_BASE_URL = 'http://172.20.10.13:3001'; // replace with your backend URL

export async function submitPotholeReport(
  photoUri: string,
  location: Location.LocationObject,
  issueType?: string
) {
  try {
    // Convert photo to base64
    const base64Photo = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });

    const response = await fetch(`${API_BASE_URL}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: `data:image/png;base64,${base64Photo}`,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        issue_type: issueType || null,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}