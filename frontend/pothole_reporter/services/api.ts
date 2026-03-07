import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";

const API_BASE_URL = "http://10.39.72.95:3001";

export async function submitPotholeReport(
  photoUri: string,
  location: Location.LocationObject,
  issueType?: string,
  severity?: number
) {
  try {
    const base64Photo = await uriToBase64(photoUri);
    
    const response = await fetch(`${API_BASE_URL}/api/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: base64Photo,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        issue_type: issueType || null,
        severity: severity || null,
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

async function uriToBase64(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
}