import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyReports, getStats, Report, submitPotholeReport } from '@/lib/api';

const APP_NAME = 'Crack';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  analyzing:  { label: 'AI Analyzing', color: '#00d4a8', bg: '#00d4a820' },
  confirmed:  { label: 'Confirmed',    color: '#00d4a8', bg: '#00d4a820' },
  dispatched: { label: 'Dispatched',   color: '#4ade80', bg: '#4ade8020' },
  resolved:   { label: 'Resolved',     color: '#94a3b8', bg: '#94a3b820' },
};

// ─── All Reports Modal ────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

function AllReportsModal({ visible, reports, onClose }: { visible: boolean; reports: Report[]; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={allReports.backdrop}>
        <View style={allReports.sheet}>
          <View style={allReports.header}>
            <Text style={allReports.title}>All Reports</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={allReports.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {reports.map((r) => {
              const s = STATUS[r.status ?? 'confirmed'] ?? STATUS.confirmed;
              return (
                <View key={r.id} style={allReports.row}>
                  <View style={allReports.icon} />
                  <View style={allReports.info}>
                    <View style={allReports.infoTop}>
                      <Text style={allReports.type}>{r.issue_type ?? 'Report'}</Text>
                      <View style={[allReports.badge, { backgroundColor: s.bg }]}>
                        <Text style={[allReports.badgeText, { color: s.color }]}>{s.label}</Text>
                      </View>
                    </View>
                    <Text style={allReports.meta}>{r.latitude != null && r.longitude != null ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : 'Unknown location'} · {timeAgo(r.created_at)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

function ReportModal({ visible, mode, userId, onClose, onSubmitted }: { visible: boolean; mode: 'camera' | 'gallery'; userId?: string; onClose: () => void; onSubmitted: () => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoTimestamp, setPhotoTimestamp] = useState<number>(Date.now());
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location permission is required');
      return null;
    }
    return Location.getCurrentPositionAsync({});
  };

  const takePhoto = async () => {
    setLoading(true);
    try {
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (camStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert('Camera and media permissions are required');
        return;
      }
      const loc = await requestLocation();
      if (!loc) return;
      setLocation(loc);

      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.3 });
      if (!result.canceled && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
        setPhotoTimestamp(Date.now());
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const pickFromGallery = async () => {
    setLoading(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photo library permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.3,
        exif: true,
      });

      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      const gps = asset.exif?.GPS ?? asset.exif;
      let lat: number | null = gps?.GPSLatitude ?? gps?.Latitude ?? null;
      let lon: number | null = gps?.GPSLongitude ?? gps?.Longitude ?? null;

      if (lat != null && lon != null) {
        const latRef = gps?.GPSLatitudeRef ?? gps?.LatitudeRef;
        const lonRef = gps?.GPSLongitudeRef ?? gps?.LongitudeRef;
        if (latRef === 'S') lat = -Math.abs(lat);
        if (lonRef === 'W') lon = -Math.abs(lon);
      }

      if (lat == null || lon == null) {
        Alert.alert(
          'No Location Found',
          'This photo does not have GPS data in its metadata. Please take a photo with your camera or choose one taken with location enabled.',
        );
        return;
      }

      // Build a Location-compatible object from EXIF coords
      setLocation({
        coords: {
          latitude: lat,
          longitude: lon,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
      // Extract EXIF timestamp if available, fall back to now
      const exifDate = asset.exif?.DateTimeOriginal ?? asset.exif?.DateTime;
      if (exifDate) {
        // EXIF format: "YYYY:MM:DD HH:MM:SS"
        const [datePart, timePart] = (exifDate as string).split(' ');
        const isoDate = datePart.replace(/:/g, '-') + 'T' + timePart;
        const parsed = new Date(isoDate).getTime();
        setPhotoTimestamp(isNaN(parsed) ? Date.now() : parsed);
      } else {
        setPhotoTimestamp(Date.now());
      }
      setPhoto(asset.uri);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const pickAnother = mode === 'gallery' ? pickFromGallery : takePhoto;
  const pickLabel = photo
    ? (mode === 'gallery' ? 'Choose Another' : 'Take Another Photo')
    : (mode === 'gallery' ? 'Choose from Gallery' : 'Open Camera');

  const submitReport = async () => {
    if (!photo || !location) {
      Alert.alert('Please take a photo first');
      return;
    }
    setLoading(true);
    try {
      await submitPotholeReport(photo, location, photoTimestamp, userId);
      Alert.alert('Report submitted successfully');
      setPhoto(null);
      setLocation(null);
      onSubmitted();
      onClose();
    } catch (error) {
      Alert.alert('Error submitting report', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPhoto(null);
    setLocation(null);
    setPhotoTimestamp(Date.now());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={modal.backdrop}>
        <View style={modal.sheet}>
          <View style={modal.handle} />

          <View style={modal.header}>
            <Text style={modal.title}>Report an Issue</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={modal.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {photo ? (
            <Image source={{ uri: photo }} style={modal.preview} />
          ) : (
            <View style={modal.placeholder}>
              <Text style={modal.placeholderIcon}>📷</Text>
              <Text style={modal.placeholderText}>No photo taken yet</Text>
            </View>
          )}

          {location && (
            <Text style={modal.location}>
              📍 {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
            </Text>
          )}

          <TouchableOpacity style={modal.btnPrimary} onPress={pickAnother} disabled={loading}>
            <Text style={modal.btnPrimaryText}>{pickLabel}</Text>
          </TouchableOpacity>

          {photo && (
            <TouchableOpacity style={modal.btnSubmit} onPress={submitReport} disabled={loading}>
              <Text style={modal.btnSubmitText}>{loading ? 'Submitting...' : 'Submit Report'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth0();
  const userId = user?.sub;
  const insets = useSafeAreaInsets();

  const [reportVisible, setReportVisible] = useState(false);
  const [reportMode, setReportMode] = useState<'camera' | 'gallery'>('camera');
  const [allReportsVisible, setAllReportsVisible] = useState(false);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [issueTypeCounts, setIssueTypeCounts] = useState<Record<string, number>>({});

  const fetchReports = async () => {
    if (!userId) return;
    try {
      const data = await getMyReports(userId);
      setMyReports(data);
    } catch {
      // silently fail
    }
  };

  const fetchStats = () => {
    getStats()
      .then(s => {
        setActiveCount(s.active_count);
        setIssueTypeCounts(s.issue_type_counts);
      })
      .catch(() => {});
  };

  // Fetch on mount and whenever the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchReports();
      fetchStats();

      // Poll every 15s while tab is focused
      const timer = setInterval(() => {
        fetchReports();
        fetchStats();
      }, 15000);

      return () => clearInterval(timer);
    }, [userId])
  );

  const totalReports = myReports.length;
  const resolvedCount = myReports.filter(r => r.status === 'resolved').length;
  const resolvedPct = totalReports > 0 ? Math.round((resolvedCount / totalReports) * 100) : 0;

  const issueTypeList = Object.entries(issueTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));

  const openReport = (mode: 'camera' | 'gallery') => {
    setReportMode(mode);
    setReportVisible(true);
  };

  const recentThree = myReports.slice(0, 3);

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>{APP_NAME}</Text>
        </View>

        {/* Report card */}
        <View style={styles.reportCard}>
          <View style={styles.cameraIconWrap}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
          <Text style={styles.reportCardTitle}>Report an Issue</Text>
          <Text style={styles.reportCardSub}>
            Capture a photo of infrastructure damage like potholes, broken signs, or damaged pipes
          </Text>
          <View style={styles.reportCardButtons}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => openReport('camera')}>
              <Text style={styles.btnPrimaryText}>📷  Open Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => openReport('gallery')}>
              <Text style={styles.btnSecondaryText}>⬆  Upload</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalReports}</Text>
            <Text style={styles.statLabel}>YOUR REPORTS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#00d4a8' }]}>{resolvedPct}%</Text>
            <Text style={styles.statLabel}>RESOLVED</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeCount ?? '—'}</Text>
            <Text style={styles.statLabel}>CITY ACTIVE</Text>
          </View>
        </View>

        {/* Recent Reports */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🕐  Recent Reports</Text>
            {myReports.length > 3 && (
              <TouchableOpacity onPress={() => setAllReportsVisible(true)}>
                <Text style={styles.viewAll}>View All →</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentThree.length === 0 ? (
            <Text style={styles.reportMeta}>No reports yet.</Text>
          ) : recentThree.map((r) => {
            const s = STATUS[r.status ?? 'confirmed'] ?? STATUS.confirmed;
            return (
              <View key={r.id} style={styles.reportRow}>
                <View style={styles.reportIcon} />
                <View style={styles.reportInfo}>
                  <View style={styles.reportInfoTop}>
                    <Text style={styles.reportType}>{r.issue_type ?? 'Report'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                      <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.reportMeta}>{r.latitude != null && r.longitude != null ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : 'Unknown location'} · {timeAgo(r.created_at)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Issue Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Issue Types</Text>
          <View style={styles.issueGrid}>
            {issueTypeList.length === 0
              ? <Text style={styles.reportMeta}>No data yet.</Text>
              : issueTypeList.map((it) => (
                  <View key={it.label} style={styles.issueCell}>
                    <Text style={styles.issueCellLabel}>{it.label}</Text>
                    <Text style={styles.issueCellCount}>{it.count}</Text>
                  </View>
                ))}
          </View>
        </View>

      </ScrollView>

      <ReportModal
        visible={reportVisible}
        mode={reportMode}
        userId={userId}
        onClose={() => setReportVisible(false)}
        onSubmitted={() => { fetchReports(); fetchStats(); }}
      />
      <AllReportsModal visible={allReportsVisible} reports={myReports} onClose={() => setAllReportsVisible(false)} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  bg:     '#0d0d0d',
  card:   '#161616',
  border: '#2a2a2a',
  text:   '#ffffff',
  muted:  '#6b7280',
  accent: '#00d4a8',
};

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 40 },

  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  appName:         { fontSize: 26, fontWeight: '800', color: C.text },
  location:        { fontSize: 13, color: C.muted, marginTop: 2 },
  activeBadge:     { backgroundColor: '#00d4a815', borderWidth: 1, borderColor: '#00d4a840', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  activeBadgeText: { color: C.accent, fontWeight: '600', fontSize: 13 },

  reportCard:        { borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  cameraIconWrap:    { width: 72, height: 72, borderRadius: 36, backgroundColor: '#00d4a810', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cameraIcon:        { fontSize: 32 },
  reportCardTitle:   { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 8 },
  reportCardSub:     { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  reportCardButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  btnPrimary:        { flex: 1, backgroundColor: C.accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimaryText:    { color: '#000', fontWeight: '700', fontSize: 15 },
  btnSecondary:      { flex: 1, backgroundColor: '#1e1e1e', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  btnSecondaryText:  { color: C.text, fontWeight: '600', fontSize: 15 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard:  { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statValue: { fontSize: 22, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 10, color: C.muted, marginTop: 4, textAlign: 'center', letterSpacing: 0.5 },

  section:       { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: C.text },
  viewAll:       { fontSize: 14, color: C.muted },

  reportRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  reportIcon:    { width: 44, height: 44, borderRadius: 10, backgroundColor: '#2a1f10', marginRight: 12 },
  reportInfo:    { flex: 1 },
  reportInfoTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  reportType:    { fontSize: 15, fontWeight: '600', color: C.text },
  reportMeta:    { fontSize: 12, color: C.muted },
  statusBadge:   { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusText:    { fontSize: 11, fontWeight: '600' },

  issueGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  issueCell:      { width: '47%', flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1e1e1e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  issueCellLabel: { color: C.text, fontSize: 14 },
  issueCellCount: { color: C.muted, fontSize: 14 },
});

const allReports = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: '#161616', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:    { fontSize: 20, fontWeight: '700', color: '#fff' },
  close:    { fontSize: 18, color: '#6b7280', paddingHorizontal: 4 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#2a2a2a' },
  icon:     { width: 44, height: 44, borderRadius: 10, backgroundColor: '#2a1f10', marginRight: 12 },
  info:     { flex: 1 },
  infoTop:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  type:     { fontSize: 15, fontWeight: '600', color: '#fff' },
  meta:     { fontSize: 12, color: '#6b7280' },
  badge:    { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:{ fontSize: 11, fontWeight: '600' },
});

const modal = StyleSheet.create({
  backdrop:        { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#161616', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:          { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:           { fontSize: 20, fontWeight: '700', color: '#fff' },
  close:           { fontSize: 18, color: '#6b7280', paddingHorizontal: 4 },
  preview:         { width: '100%', height: 220, borderRadius: 12, marginBottom: 12 },
  placeholder:     { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#1e1e1e', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a', borderStyle: 'dashed' },
  placeholderIcon: { fontSize: 36, marginBottom: 8 },
  placeholderText: { color: '#6b7280', fontSize: 14 },
  location:        { fontSize: 12, color: '#6b7280', marginBottom: 16 },
  btnPrimary:      { backgroundColor: '#00d4a8', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  btnPrimaryText:  { color: '#000', fontWeight: '700', fontSize: 15 },
  btnSubmit:       { backgroundColor: '#1e3a2e', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#00d4a840' },
  btnSubmitText:   { color: '#00d4a8', fontWeight: '700', fontSize: 15 },
});
