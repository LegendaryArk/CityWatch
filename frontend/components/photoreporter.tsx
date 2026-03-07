import React, { useState } from 'react';
import { View, Button, Text, Image, TextInput, ScrollView, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { submitPotholeReport } from '../services/api';

export default function PhotoReporter() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [issueType, setIssueType] = useState('');

  const router = useRouter();

  const takePhoto = async () => {
    setLoading(true);
    try {
      // Request camera & media permissions
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert('Camera and media permissions are required!');
        return;
      }

      // Request location permission
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Location permission is required!');
        return;
      }

      // Get current location
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      // Launch camera
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
      Alert.alert('Report submitted successfully!');
      // Reset form
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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Report a Pothole</Text>

        {photo && (
          <Image
            source={{ uri: photo }}
            style={styles.photo}
          />
        )}

        {location && (
          <Text style={styles.locationText}>
            📍 Lat: {location.coords.latitude.toFixed(4)}, Lon: {location.coords.longitude.toFixed(4)}
          </Text>
        )}

        <Button
          title={photo ? 'Take Another Photo' : 'Take Photo'}
          onPress={takePhoto}
          disabled={loading}
        />

        {photo && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Issue Type (Optional)</Text>
              <TextInput
                placeholder="e.g., pothole, crack, bump"
                value={issueType}
                onChangeText={setIssueType}
                style={styles.input}
              />
            </View>

            <Button
              title={loading ? 'Submitting...' : 'Submit Report'}
              onPress={submitReport}
              disabled={loading}
            />

            <View style={{ marginTop: 20 }}>
              <Button
                title="View Heatmap"
                onPress={() => router.push('/(tabs)')}
              />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  container: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  photo: { width: 250, height: 200, marginBottom: 20, borderRadius: 10 },
  locationText: { marginBottom: 15, fontSize: 14, color: '#666' },
  inputContainer: { marginVertical: 20, width: '100%' },
  label: { marginBottom: 8, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
});