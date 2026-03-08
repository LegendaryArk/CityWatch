import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { Auth0Provider, useAuth0 } from "react-native-auth0";
import "react-native-reanimated";

const DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? '';
const CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? '';

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user } = useAuth0();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
      {!user && <Redirect href="/login" />}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Auth0Provider domain={DOMAIN} clientId={CLIENT_ID}>
      <RootLayoutNav />
    </Auth0Provider>
  );
}
