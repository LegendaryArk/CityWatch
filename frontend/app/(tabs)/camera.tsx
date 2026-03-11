import { getHeatmap, getStats, HeatmapCell, HeatmapPeriod, StatsData } from '@/lib/api';
import MapboxGL from '@rnmapbox/maps';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN!);

// ─── Layout constants ─────────────────────────────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_Y = SCREEN_HEIGHT * 0.62;
const EXPANDED_Y  = SCREEN_HEIGHT * 0.08;

// ─── Period selector config ───────────────────────────────────────────────────

type Period = { key: HeatmapPeriod; label: string };

const PERIODS: Period[] = [
  { key: 'current', label: 'Now'    },
  { key: '30d',     label: '30 Days' },
  { key: '90d',     label: '90 Days' },
  { key: '365d',    label: '1 Year'  },
];

// ─── Heatmap layer style ──────────────────────────────────────────────────────

const heatmapLayerStyle: any = {
  heatmapWeight:    ['interpolate', ['linear'], ['get', 'value'], 0, 0, 1, 1],
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

const markerCircleStyle: any = {
  circleRadius:      10,
  circleColor:       '#ef4444',
  circleOpacity:     0.9,
  circleStrokeWidth: 2,
  circleStrokeColor: '#ffffff',
};

// ─── Priority badge helper ────────────────────────────────────────────────────

function priorityForValue(value: number): { label: string; color: string; bg: string } {
  if (value >= 0.75) return { label: 'critical', color: '#ef4444', bg: '#ef444420' };
  if (value >= 0.5)  return { label: 'high',     color: '#f97316', bg: '#f9731620' };
  if (value >= 0.25) return { label: 'medium',   color: '#eab308', bg: '#eab30820' };
  return                    { label: 'low',       color: '#00d4a8', bg: '#00d4a820' };
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN!;

async function reverseGeocode(lon: number, lat: number): Promise<string> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=neighborhood,locality,place&limit=1&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const json = await res.json();
    const feature = json.features?.[0];
    if (!feature) return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    // Return neighborhood or place name
    return feature.text ?? feature.place_name?.split(',')[0] ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HeatmapScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<HeatmapPeriod>('current');
  const [heatmapCells, setHeatmapCells] = useState<HeatmapCell[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoneNames, setZoneNames] = useState<string[]>([]);

  // Fetch heatmap whenever period changes
  useEffect(() => {
    setLoading(true);
    getHeatmap(period)
      .then(setHeatmapCells)
      .catch(err => console.error('Heatmap fetch failed:', err))
      .finally(() => setLoading(false));
  }, [period]);

  // Fetch stats once on mount
  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(err => console.error('Stats fetch failed:', err));
  }, []);

  // Build GeoJSON for heatmap layer
  const heatmapGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: heatmapCells
      .filter(c => c.latitude != null && c.longitude != null)
      .map(c => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
        properties: { value: c.value, issue_count: c.issue_count },
      })),
  };

  // Top 5 risk zones (sorted by value descending, already sorted from API)
  const topZones = heatmapCells.slice(0, 5);

  // Reverse-geocode top zones whenever they change
  useEffect(() => {
    if (topZones.length === 0) return;
    Promise.all(topZones.map(z => reverseGeocode(z.longitude, z.latitude)))
      .then(setZoneNames)
      .catch(() => {});
  }, [heatmapCells]);

  // Build GeoJSON for top-zone markers
  const markersGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: topZones
      .filter(c => c.latitude != null && c.longitude != null)
      .map((c, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
        properties: { rank: i + 1, value: c.value, issue_count: c.issue_count },
      })),
  };

  // Derive map center from top cell or fallback
  const centerCoord: [number, number] = topZones[0]
    ? [topZones[0].longitude, topZones[0].latitude]
    : [-80.520, 43.464];

  // Stats cards
  const issueTypeEntries = Object.entries(stats?.issue_type_counts ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const statsCards = [
    {
      icon: '⚠️',
      value: stats ? String(stats.active_count) : '—',
      label: 'Active Issues',
    },
    {
      icon: '✅',
      value: stats ? String(stats.resolved_this_week) : '—',
      label: 'Resolved This Week',
    },
    {
      icon: '📍',
      value: stats ? String(heatmapCells.length) : '—',
      label: 'Risk Grid Cells',
    },
    {
      icon: '📈',
      value: stats ? String(stats.total_count) : '—',
      label: 'Total Reports',
    },
  ];

  // Bottom sheet animation
  const translateY = useRef(new Animated.Value(COLLAPSED_Y)).current;
  const lastY = useRef(COLLAPSED_Y);

  const snapTo = (y: number) => {
    lastY.current = y;
    Animated.spring(translateY, {
      toValue: y,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  };

  // Shared pan logic — handle area and period row both control the sheet
  const makePan = (snapFn: (y: number) => void) =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        const next = lastY.current + g.dy;
        translateY.setValue(Math.max(EXPANDED_Y, Math.min(COLLAPSED_Y, next)));
      },
      onPanResponderRelease: (_, g) => {
        const next = lastY.current + g.dy;
        if (g.vy < -0.5) snapFn(EXPANDED_Y);
        else if (g.vy > 0.5) snapFn(COLLAPSED_Y);
        else snapFn(next < (EXPANDED_Y + COLLAPSED_Y) / 2 ? EXPANDED_Y : COLLAPSED_Y);
      },
    });

  const handlePan = useRef(makePan(snapTo)).current;
  const periodPan = useRef(makePan(snapTo)).current;

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapboxGL.MapView style={styles.map} styleURL={MapboxGL.StyleURL.Dark}>
        <MapboxGL.Camera zoomLevel={13} centerCoordinate={centerCoord} />

        {/* Heatmap layer */}
        {heatmapCells.length > 0 && (
          <MapboxGL.ShapeSource id="heatmap-source" shape={heatmapGeoJSON}>
            <MapboxGL.HeatmapLayer id="heatmap-layer" sourceID="heatmap-source" style={heatmapLayerStyle} />
          </MapboxGL.ShapeSource>
        )}

        {/* Top risk zone markers */}
        {topZones.length > 0 && (
          <MapboxGL.ShapeSource id="markers-source" shape={markersGeoJSON}>
            <MapboxGL.CircleLayer id="markers-layer" sourceID="markers-source" style={markerCircleStyle} />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00d4a8" />
        </View>
      )}

      {/* Bottom sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle + title */}
        <View {...handlePan.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Risk Heatmap</Text>
          <TouchableOpacity onPress={() => snapTo(EXPANDED_Y)}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>

        {/* Period selector — also draggable to expand/collapse */}
        <View {...periodPan.panHandlers} style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.periodBtnText, period === p.key && styles.periodBtnTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.sheetScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        >
          {/* Stats row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsContent}>
            {statsCards.map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Top risk zones */}
          <View style={styles.zonesHeader}>
            <Text style={styles.zonesTitle}>Top Risk Areas</Text>
          </View>
          <View style={styles.zones}>
            {topZones.length === 0 && !loading && (
              <Text style={styles.emptyText}>No heatmap data available</Text>
            )}
            {topZones.map((z, i) => {
              const p = priorityForValue(z.value);
              return (
                <View key={`${z.latitude}-${z.longitude}`} style={styles.zoneRow}>
                  <View style={styles.zoneRank}>
                    <Text style={styles.zoneRankText}>{i + 1}</Text>
                  </View>
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName}>
                      {zoneNames[i] ?? `${z.latitude.toFixed(4)}, ${z.longitude.toFixed(4)}`}
                    </Text>
                      <Text style={styles.zoneMeta}>
                        {z.issue_count} issue{z.issue_count !== 1 ? 's' : ''} · risk {(z.value * 100).toFixed(0)}%
                      </Text>
                      <Text style={[styles.zoneMeta, { marginTop: 2 }]}> 
                        avg {(z.avg_severity * 100).toFixed(0)}% · 30d {(z.predict_30d * 100).toFixed(0)}% · 90d {(z.predict_90d * 100).toFixed(0)}% · 1y {(z.predict_365d * 100).toFixed(0)}%
                      </Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: p.bg }]}>
                    <Text style={[styles.priorityText, { color: p.color }]}>{p.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Issue type breakdown */}
          {issueTypeEntries.length > 0 && (
            <>
              <View style={styles.zonesHeader}>
                <Text style={styles.zonesTitle}>Issue Breakdown</Text>
              </View>
              <View style={[styles.zones, { paddingBottom: 40 }]}>
                {issueTypeEntries.map(([type, count]) => (
                  <View key={type} style={styles.issueRow}>
                    <Text style={styles.issueType}>{type}</Text>
                    <Text style={styles.issueCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  loadingOverlay: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: '#00000040',
  },

  sheet: {
    position:             'absolute',
    left:                 0,
    right:                0,
    height:               SCREEN_HEIGHT,
    backgroundColor:      '#111',
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    shadowColor:          '#000',
    shadowOffset:         { width: 0, height: -4 },
    shadowOpacity:        0.4,
    shadowRadius:         12,
  },

  handleArea: {
    flexDirection:      'row',
    alignItems:         'center',
    paddingHorizontal:  20,
    paddingTop:         12,
    paddingBottom:      14,
    borderBottomWidth:  1,
    borderBottomColor:  '#222',
  },
  handle: {
    position:         'absolute',
    top:              8,
    alignSelf:        'center',
    left:             '50%',
    width:            40,
    height:           4,
    borderRadius:     2,
    backgroundColor:  '#333',
    marginLeft:       -20,
  },
  sheetTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 10 },
  viewAll:    { fontSize: 14, color: '#6b7280', marginTop: 10 },

  // Period selector
  periodRow: {
    flexDirection:     'row',
    paddingHorizontal: 16,
    paddingVertical:   10,
    gap:               8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  periodBtn: {
    flex:            1,
    paddingVertical: 7,
    borderRadius:    8,
    alignItems:      'center',
    backgroundColor: '#1a1a1a',
    borderWidth:     1,
    borderColor:     '#2a2a2a',
  },
  periodBtnActive: {
    backgroundColor: '#00d4a815',
    borderColor:     '#00d4a8',
  },
  periodBtnText:       { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  periodBtnTextActive: { color: '#00d4a8' },

  sheetScroll: { flex: 1 },

  // Stats
  statsScroll:   { marginTop: 16 },
  statsContent:  { paddingHorizontal: 16, gap: 10 },
  statCard: {
    width:           130,
    backgroundColor: '#1a1a1a',
    borderRadius:    14,
    padding:         14,
    borderWidth:     1,
    borderColor:     '#2a2a2a',
    alignItems:      'flex-start',
  },
  statIcon:  { fontSize: 18, marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6b7280' },

  // Zones
  zonesHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  zonesTitle:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  emptyText:   { color: '#6b7280', fontSize: 14, paddingHorizontal: 16 },

  zones: { paddingHorizontal: 16, gap: 10 },
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
  zoneName:      { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 3 },
  zoneMeta:      { fontSize: 12, color: '#6b7280' },
  priorityBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  priorityText:  { fontSize: 12, fontWeight: '600' },

  // Issue breakdown
  issueRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: '#1a1a1a',
    borderRadius:    10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth:     1,
    borderColor:     '#2a2a2a',
  },
  issueType:  { color: '#fff', fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
  issueCount: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
});
