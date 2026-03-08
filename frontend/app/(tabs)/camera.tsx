import MapboxGL from '@rnmapbox/maps';
import { useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN!);

// ─── Placeholder data — swap with real API responses ─────────────────────────

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

const STATS = [
  { value: '247',  label: 'Active Issues',       change: '+12%', changeUp: true,  icon: '⚠️' },
  { value: '89',   label: 'Resolved This Week',  change: '+23%', changeUp: true,  icon: '✅' },
  { value: '2.4h', label: 'Avg. Response Time',  change: '-18%', changeUp: false, icon: '🕐' },
  { value: '94%',  label: 'Prediction Accuracy', change: '+2%',  changeUp: true,  icon: '📈' },
];

const PRIORITY_ZONES = [
  { rank: 1, name: 'Downtown Core',      issues: 34, cost: '$45,000', priority: 'critical' },
  { rank: 2, name: 'Industrial Park East', issues: 28, cost: '$32,000', priority: 'high'     },
  { rank: 3, name: 'Riverside District', issues: 19, cost: '$18,500', priority: 'medium'   },
  { rank: 4, name: 'North Residential',  issues: 12, cost: '$8,200',  priority: 'low'      },
];

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  critical: { color: '#ef4444', bg: '#ef444420' },
  high:     { color: '#f97316', bg: '#f9731620' },
  medium:   { color: '#eab308', bg: '#eab30820' },
  low:      { color: '#00d4a8', bg: '#00d4a820' },
};

// ─── Layout constants ─────────────────────────────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_Y = SCREEN_HEIGHT * 0.62;  // sheet top when collapsed
const EXPANDED_Y  = SCREEN_HEIGHT * 0.08;  // sheet top when fully expanded

const heatmapStyle: any = {
  heatmapWeight:    ['interpolate', ['linear'], ['get', 'severity'], 0, 0, 1, 1],
  heatmapIntensity: 1.5,
  heatmapRadius:    40,
  heatmapOpacity:   0.85,
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function HeatmapScreen() {
  const translateY = useRef(new Animated.Value(COLLAPSED_Y)).current;
  const lastY = useRef(COLLAPSED_Y);

  const snapTo = (y: number) => {
    lastY.current = y;
    Animated.spring(translateY, { toValue: y, useNativeDriver: true, bounciness: 4 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        const next = lastY.current + g.dy;
        translateY.setValue(Math.max(EXPANDED_Y, Math.min(COLLAPSED_Y, next)));
      },
      onPanResponderRelease: (_, g) => {
        const next = lastY.current + g.dy;
        snapTo(next < (EXPANDED_Y + COLLAPSED_Y) / 2 ? EXPANDED_Y : COLLAPSED_Y);
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapboxGL.MapView style={styles.map} styleURL={MapboxGL.StyleURL.Dark}>
        <MapboxGL.Camera zoomLevel={13} centerCoordinate={[-80.520, 43.464]} />
        <MapboxGL.ShapeSource id="potholes" shape={POTHOLE_DATA}>
          <MapboxGL.HeatmapLayer id="potholes-heat" sourceID="potholes" style={heatmapStyle} />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>

      {/* Bottom sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>🔧  Repair Priority Zones</Text>
          <TouchableOpacity onPress={() => snapTo(EXPANDED_Y)}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          {/* Stats row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsContent}>
            {STATS.map((s) => (
              <View key={s.label} style={styles.statCard}>
                <View style={styles.statTop}>
                  <Text style={styles.statIcon}>{s.icon}</Text>
                  <Text style={[styles.statChange, { color: s.changeUp ? '#00d4a8' : '#ef4444' }]}>{s.change}</Text>
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Priority zones */}
          <View style={styles.zones}>
            {PRIORITY_ZONES.map((z) => {
              const p = PRIORITY_STYLE[z.priority];
              return (
                <View key={z.rank} style={styles.zoneRow}>
                  <View style={styles.zoneRank}>
                    <Text style={styles.zoneRankText}>{z.rank}</Text>
                  </View>
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName}>📍  {z.name}</Text>
                    <Text style={styles.zoneMeta}>{z.issues} issues · {z.cost}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: p.bg }]}>
                    <Text style={[styles.priorityText, { color: p.color }]}>{z.priority}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  sheet: {
    position:        'absolute',
    left:            0,
    right:           0,
    height:          SCREEN_HEIGHT,
    backgroundColor: '#111',
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -4 },
    shadowOpacity:   0.4,
    shadowRadius:    12,
  },

  handleArea: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 20,
    paddingTop:     12,
    paddingBottom:  14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  handle: {
    position:     'absolute',
    top:          8,
    alignSelf:    'center',
    left:         '50%',
    width:        40,
    height:       4,
    borderRadius: 2,
    backgroundColor: '#333',
    marginLeft:   -20,
  },
  sheetTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 10 },
  viewAll:    { fontSize: 14, color: '#6b7280', marginTop: 10 },

  sheetScroll: { flex: 1 },

  // Stats
  statsScroll:   { marginTop: 16 },
  statsContent:  { paddingHorizontal: 16, gap: 10 },
  statCard: {
    width:           140,
    backgroundColor: '#1a1a1a',
    borderRadius:    14,
    padding:         14,
    borderWidth:     1,
    borderColor:     '#2a2a2a',
  },
  statTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statIcon:   { fontSize: 18 },
  statChange: { fontSize: 12, fontWeight: '600' },
  statValue:  { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLabel:  { fontSize: 12, color: '#6b7280' },

  // Zones
  zones: { padding: 16, gap: 10 },
  zoneRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#1a1a1a',
    borderRadius:    12,
    padding:         14,
    borderWidth:     1,
    borderColor:     '#2a2a2a',
  },
  zoneRank: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: '#2a2a2a',
    justifyContent:  'center',
    alignItems:      'center',
    marginRight:     12,
  },
  zoneRankText:  { color: '#6b7280', fontWeight: '700', fontSize: 13 },
  zoneInfo:      { flex: 1 },
  zoneName:      { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 3 },
  zoneMeta:      { fontSize: 12, color: '#6b7280' },
  priorityBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  priorityText:  { fontSize: 12, fontWeight: '600' },
});
