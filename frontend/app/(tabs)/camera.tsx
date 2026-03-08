import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { submitPotholeReport } from '@/lib/api';

export default function CameraScreen() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [issueType, setIssueType] = useState('');

  const takePhoto = async () => {
    setLoading(true);
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert('Camera and media permissions are required');
        return;
      }

      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Location permission is required');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3,
      });

      if (!result.canceled && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async () => {
    if (!photo || !location) {
      Alert.alert('Please take a photo first');
      return;
    }

    setLoading(true);
    try {
      await submitPotholeReport(photo, location, issueType || undefined);
      Alert.alert('Report submitted successfully');
      setPhoto(null);
      setLocation(null);
      setIssueType('');
    } catch (error) {
      Alert.alert('Error submitting report', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.container}>
        <Text style={styles.title}>Report a Pothole</Text>

        {photo && (
          <Image source={{ uri: photo }} style={styles.photo} />
        )}

        {location && (
          <Text style={styles.location}>
            Lat: {location.coords.latitude.toFixed(4)}, Lon: {location.coords.longitude.toFixed(4)}
          </Text>
        )}

        <TouchableOpacity style={styles.btn} onPress={takePhoto} disabled={loading}>
          <Text style={styles.btnText}>{photo ? 'Take Another Photo' : 'Take Photo'}</Text>
        </TouchableOpacity>

        {photo && (
          <>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Issue Type (optional)</Text>
              <TextInput
                placeholder="e.g. pothole, crack, bump"
                value={issueType}
                onChangeText={setIssueType}
                style={styles.input}
              />
            </View>

            <TouchableOpacity style={styles.btn} onPress={submitReport} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Submitting...' : 'Submit Report'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  container: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  photo: { width: 250, height: 200, marginBottom: 20, borderRadius: 10 },
  location: { marginBottom: 15, fontSize: 14, color: '#666' },
  btn: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginVertical: 8,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  inputWrap: { marginVertical: 16, width: '100%' },
  label: { marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
  },
});
