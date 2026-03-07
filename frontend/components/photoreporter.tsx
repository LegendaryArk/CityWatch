// app/components/PhotoReporter.tsx
import React, { useState } from 'react';
import { View, Button, Text, Image, TextInput, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { submitPotholeReport } from '../services/api';

export default function PhotoReporter() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [issueType, setIssueType] = useState('');

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
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Report a Pothole</Text>

        {photo && (
          <Image
            source={{ uri: photo }}
            style={{ width: 250, height: 200, marginBottom: 20, borderRadius: 10 }}
          />
        )}

        {location && (
          <Text style={{ marginBottom: 15, fontSize: 14, color: '#666' }}>
            📍 Lat: {location.coords.latitude.toFixed(4)}, Lon: {location.coords.longitude.toFixed(4)}
          </Text>
        )}

        <Button title={photo ? 'Take Another Photo' : 'Take Photo'} onPress={takePhoto} disabled={loading} />

        {photo && (
          <>
            <View style={{ marginVertical: 20, width: '100%' }}>
              <Text style={{ marginBottom: 8, fontWeight: '600' }}>Issue Type (Optional)</Text>
              <TextInput
                placeholder="e.g., pothole, crack, bump"
                value={issueType}
                onChangeText={setIssueType}
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 15,
                }}
              />
            </View>

            <Button title={loading ? 'Submitting...' : 'Submit Report'} onPress={submitReport} disabled={loading} />
          </>
        )}
      </View>
    </ScrollView>
  );
}