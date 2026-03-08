import { createClient } from '@supabase/supabase-js';
import * as Location from 'expo-location';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);

async function uploadPhotoToStorage(photoUri: string, userId: string): Promise<string> {
  const safeUserId = userId.replace(/[|\\/:*?"<>]/g, '-');
  const fileName = `${safeUserId}/${Date.now()}.jpg`;

  // Fetch the local file URI as an ArrayBuffer (works on both iOS and Android)
  const response = await fetch(photoUri);
  const arrayBuffer = await response.arrayBuffer();

  const { data, error } = await supabase.storage
    .from('reports')
    .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from('reports').getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function submitPotholeReport(
  photoUri: string,
  location: Location.LocationObject,
  photoTimestamp: number,   // ms since epoch — from EXIF DateTime or Date.now()
  userId?: string,
) {
  const imageUrl = await uploadPhotoToStorage(photoUri, userId ?? 'anonymous');

  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      photo_timestamp: new Date(photoTimestamp).toISOString(),
      user_id: userId ?? null,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

export type Report = {
  id: string;
  image_url: string | null;
  issue_type: string | null;
  severity: number | null;
  status: string | null;
  created_at: string;
  // loc is returned as GeoJSON from the backend
  latitude: number | null;
  longitude: number | null;
};

export async function getMyReports(userId: string): Promise<Report[]> {
  const response = await fetch(`${API_BASE_URL}/api/reports?user_id=${encodeURIComponent(userId)}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const json = await response.json();
  return json.data;
}

export async function saveUser(id: string, email: string) {
  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, email }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to save user: ${message}`);
  }

  return response.json();
}

export type StatsData = {
  active_count: number;
  resolved_this_week: number;
  total_count: number;
  issue_type_counts: Record<string, number>;
};

export async function getStats(): Promise<StatsData> {
  const response = await fetch(`${API_BASE_URL}/api/stats`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const json = await response.json();
  return json.data;
}

export type HeatmapPeriod = 'current' | '30d' | '90d' | '365d';

export type HeatmapCell = {
  latitude: number;
  longitude: number;
  issue_count: number;
  value: number;         // the selected period's risk value
  avg_severity: number;
  predict_30d: number;
  predict_90d: number;
  predict_365d: number;
};

export async function getHeatmap(period: HeatmapPeriod = 'current'): Promise<HeatmapCell[]> {
  const response = await fetch(`${API_BASE_URL}/api/heatmap?period=${period}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const json = await response.json();
  return json.data;
}
