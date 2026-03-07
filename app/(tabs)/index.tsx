import { StyleSheet, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN!);

// Swap this out with real data from your API later — structure stays identical
const POTHOLE_DATA: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.520, 43.464] }, properties: { severity: 0.9 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.521, 43.465] }, properties: { severity: 0.6 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.519, 43.463] }, properties: { severity: 0.8 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.518, 43.464] }, properties: { severity: 0.4 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.522, 43.466] }, properties: { severity: 1.0 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.520, 43.462] }, properties: { severity: 0.7 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.523, 43.465] }, properties: { severity: 0.5 } },
  ],
};

const heatmapStyle: any = {
  heatmapWeight: ['interpolate', ['linear'], ['get', 'severity'], 0, 0, 1, 1],
  heatmapIntensity: 1.5,
  heatmapRadius: 40,
  heatmapOpacity: 0.85,
  heatmapColor: [
    'interpolate', ['linear'], ['heatmap-density'],
    0,   'rgba(0,0,255,0)',
    0.2, 'rgba(0,255,255,0.8)',
    0.4, 'rgba(0,255,0,0.8)',
    0.6, 'rgba(255,255,0,0.9)',
    0.8, 'rgba(255,128,0,0.9)',
    1,   'rgba(255,0,0,1)',
  ],
};

export default function HeatmapScreen() {
  return (
    <View style={styles.container}>
      <MapboxGL.MapView style={styles.map} styleURL={MapboxGL.StyleURL.Dark}>
        <MapboxGL.Camera zoomLevel={13} centerCoordinate={[-80.520, 43.464]} />
        <MapboxGL.ShapeSource id="potholes" shape={POTHOLE_DATA}>
          <MapboxGL.HeatmapLayer
            id="potholes-heat"
            sourceID="potholes"
            style={heatmapStyle}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
