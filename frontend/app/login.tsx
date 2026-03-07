import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth0 } from "react-native-auth0";

const resolveApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // In Expo dev, hostUri usually looks like "192.168.x.x:8081".
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host) {
    return `http://${host}:3001`;
  }

  return Platform.OS === "android"
    ? "http://10.0.2.2:3001"
    : "http://localhost:3001";
};

const API_BASE_URL = resolveApiBaseUrl();

function decodeJwtPayload(token: string) {
  const base64Payload = token.split(".")[1];
  if (!base64Payload || typeof globalThis.atob !== "function") {
    return null;
  }

  try {
    return JSON.parse(globalThis.atob(base64Payload));
  } catch {
    return null;
  }
}

export default function Login() {
  const { authorize } = useAuth0();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const authenticateAndSaveUser = async (forceAccountChooser: boolean) => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    try {
      const credentials = await authorize(
        forceAccountChooser
          ? { additionalParameters: { prompt: "login" } }
          : undefined,
      );

      if (credentials?.idToken) {
        const payload = decodeJwtPayload(credentials.idToken);
        if (payload?.sub && payload?.email) {
          const response = await fetch(`${API_BASE_URL}/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: payload.sub, email: payload.email }),
          });

          if (!response.ok) {
            const message = await response.text();
            throw new Error(`Failed to save user: ${message}`);
          }
        }
      }
      router.replace("/(tabs)");
    } catch (e) {
      console.log("login error", e);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const login = async () => {
    await authenticateAndSaveUser(false);
  };

  const switchAccount = async () => {
    await authenticateAndSaveUser(true);
  };

  // Buildings: [width, height]
  const BUILDINGS = [
    [44, 140], [32, 90], [56, 200], [38, 120], [28, 70],
    [50, 180], [36, 100], [62, 160], [40, 130], [30, 85],
    [48, 190], [34, 110], [28, 65], [52, 150], [36, 115],
  ];

  return (
    <LinearGradient colors={["#000000", "#000000", "#0d1b2a", "#1a3050"]} locations={[0, 0.3, 0.7, 1]} style={styles.container}>
      {/* City skyline silhouette */}
      <View style={styles.skyline} pointerEvents="none">
        {BUILDINGS.map(([w, h], i) => (
          <View
            key={i}
            style={[styles.building, { width: w, height: h }]}
          />
        ))}
      </View>

      {/* Road line at bottom of skyline */}
      <View style={styles.road} pointerEvents="none" />

      <View style={styles.top}>
        <View style={styles.pulseWrap}>
          <View style={styles.ring3} />
          <View style={styles.ring2} />
          <View style={styles.ring1} />
          <View style={styles.iconCircle}>
            <View style={styles.triangle} />
            <Text style={styles.exclaim}>!</Text>
          </View>
        </View>

        <Text style={styles.appName}>Pothole Reporter</Text>
        <Text style={styles.tagline}>Report road damage. Help your city.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btnPrimary, isAuthenticating && styles.btnDisabled]}
          onPress={login}
          disabled={isAuthenticating}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>
            {isAuthenticating ? "Signing in…" : "Sign in"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnOutline}
          onPress={switchAccount}
          disabled={isAuthenticating}
          activeOpacity={0.7}
        >
          <Text style={styles.btnOutlineText}>Use a different account</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const ORANGE = "#fb923c";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 100,
    paddingBottom: 56,
    paddingHorizontal: 28,
  },
  skyline: {
    position: "absolute",
    bottom: 140,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    opacity: 0.3,
    gap: 4,
    paddingHorizontal: 4,
  },
  building: {
    backgroundColor: "#38bdf8",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  road: {
    position: "absolute",
    bottom: 136,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#38bdf8",
    opacity: 0.25,
  },
  top: {
    alignItems: "center",
    gap: 20,
  },
  pulseWrap: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  ring3: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#f9731610",
  },
  ring2: {
    position: "absolute",
    width: 152,
    height: 152,
    borderRadius: 76,
    borderWidth: 1,
    borderColor: "#f9731625",
  },
  ring1: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: "#f9731640",
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#f9731660",
    justifyContent: "center",
    alignItems: "center",
  },
  triangle: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderBottomWidth: 38,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: ORANGE,
    top: 14,
  },
  exclaim: {
    position: "absolute",
    color: "#000",
    fontSize: 18,
    fontWeight: "900",
    top: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: "#6a6a6a",
    textAlign: "center",
  },
  actions: {
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: ORANGE,
    paddingVertical: 17,
    borderRadius: 50,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 17,
    borderRadius: 50,
    alignItems: "center",
  },
  btnOutlineText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
