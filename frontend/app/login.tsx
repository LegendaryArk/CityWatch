import Constants from "expo-constants";
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pothole Reporter</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={login}
        disabled={isAuthenticating}
      >
        <Text style={styles.buttonText}>
          {isAuthenticating ? "Logging In..." : "Log In"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={switchAccount}
        style={styles.switchButton}
        disabled={isAuthenticating}
      >
        <Text style={styles.switchText}>Sign in with a different account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 40 },
  button: {
    backgroundColor: "#635bff",
    padding: 16,
    borderRadius: 10,
    width: 200,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  switchButton: { marginTop: 8 },
  switchText: { color: "#aaa", fontSize: 14, textDecorationLine: "underline" },
});
