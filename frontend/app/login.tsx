import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth0 } from "react-native-auth0";
import { saveUser } from "@/lib/api";
import { decodeJwtPayload } from "@/lib/jwt";

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
          await saveUser(payload.sub, payload.email);
        }
      }
      router.replace("/(tabs)");
    } catch (e) {
      console.log("login error", e);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pothole Reporter</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => authenticateAndSaveUser(false)}
        disabled={isAuthenticating}
      >
        <Text style={styles.buttonText}>
          {isAuthenticating ? "Logging In..." : "Log In"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => authenticateAndSaveUser(true)}
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
