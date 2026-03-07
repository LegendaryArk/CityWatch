// import { useState } from "react";
// import { View, Button, Text, Image, TextInput, ScrollView } from "react-native";
// import * as Location from "expo-location";
// import * as ImagePicker from "expo-image-picker";
// import { submitPotholeReport } from "../services/api";

// export default function PhotoReporter() {
//   const [photo, setPhoto] = useState<string | null>(null);
//   const [location, setLocation] = useState<Location.LocationObject | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [issueType, setIssueType] = useState<string>("");
//   const [severity, setSeverity] = useState<number>(5);

//   const takePhoto = async () => {
//     setLoading(true);
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== "granted") {
//         alert("Permission to access location was denied");
//         return;
//       }
//       const loc = await Location.getCurrentPositionAsync({});
//       setLocation(loc);

//       const result = await ImagePicker.launchCameraAsync({
//         allowsEditing: false,
//         aspect: [4, 3],
//         quality: 0.8,
//       });

//       if (!result.canceled) {
//         setPhoto(result.assets[0].uri);
//       }
//     } catch (error) {
//       alert("Error: " + (error as Error).message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const submitReport = async () => {
//     if (!photo || !location) {
//       alert("Please take a photo first");
//       return;
//     }

//     setLoading(true);
//     try {
//       await submitPotholeReport(photo, location, issueType || undefined, severity);
//       alert("Report submitted successfully!");
//       setPhoto(null);
//       setLocation(null);
//       setIssueType("");
//       setSeverity(5);
//     } catch (error) {
//       alert("Error submitting report: " + (error as Error).message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}>
//       <View style={{ alignItems: "center" }}>
//         <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>Report a Pothole</Text>

//         {photo && (
//           <Image 
//             source={{ uri: photo }} 
//             style={{ width: 250, height: 200, marginBottom: 20, borderRadius: 10 }} 
//           />
//         )}

//         {location && (
//           <Text style={{ marginBottom: 15, fontSize: 14, color: "#666" }}>
//             📍 Lat: {location.coords.latitude.toFixed(4)}, Lon: {location.coords.longitude.toFixed(4)}
//           </Text>
//         )}

//         <Button 
//           title={photo ? "Take Another Photo" : "Take Photo"} 
//           onPress={takePhoto} 
//           disabled={loading} 
//         />

//         {photo && (
//           <>
//             <View style={{ marginVertical: 20, width: "100%" }}>
//               <Text style={{ marginBottom: 8, fontWeight: "600" }}>Issue Type (Optional)</Text>
//               <TextInput
//                 placeholder="e.g., pothole, crack, bump"
//                 value={issueType}
//                 onChangeText={setIssueType}
//                 style={{
//                   borderWidth: 1,
//                   borderColor: "#ccc",
//                   padding: 10,
//                   borderRadius: 8,
//                   marginBottom: 15,
//                 }}
//               />

//               <Text style={{ marginBottom: 8, fontWeight: "600" }}>Severity (1-10)</Text>
//               <TextInput
//                 placeholder="5"
//                 value={severity.toString()}
//                 onChangeText={(text) => setSeverity(parseInt(text) || 5)}
//                 keyboardType="numeric"
//                 style={{
//                   borderWidth: 1,
//                   borderColor: "#ccc",
//                   padding: 10,
//                   borderRadius: 8,
//                 }}
//               />
//             </View>

//             <Button 
//               title={loading ? "Submitting..." : "Submit Report"} 
//               onPress={submitReport} 
//               disabled={loading}
//             />
//           </>
//         )}
//       </View>
//     </ScrollView>
//   );
// }
// components/PhotoReporter.tsx
import { useState } from "react";
import { View, Button, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

export default function PhotoReporter() {
  const [image, setImage] = useState<string | null>(null);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync();
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const getLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Location permission required");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    console.log(location.coords);
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Button title="Take Photo" onPress={takePhoto} />
      <Button title="Get Location" onPress={getLocation} />
      {image && <Image source={{ uri: image }} style={{ width: 200, height: 200, marginTop: 20 }} />}
    </View>
  );
}