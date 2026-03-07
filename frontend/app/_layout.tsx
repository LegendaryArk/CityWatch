import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Auth0Provider, useAuth0 } from 'react-native-auth0';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

const DOMAIN = 'dev-605kdxk6bcdi03iw.us.auth0.com';
const CLIENT_ID = '3f12DBjUcYfcdSgHTTzGMhTMByiOMJJm';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user } = useAuth0();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
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
