import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, Text, useColorScheme } from 'react-native';

function TabBarButton(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

const TINT = { light: '#0a7ea4', dark: '#fff' };

export default function TabLayout() {
  const scheme = useColorScheme() ?? 'light';
  const tint = TINT[scheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        headerShown: false,
        tabBarButton: TabBarButton,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name="house.fill" tintColor={color} resizeMode="scaleAspectFit" style={{ width: 28, height: 28 }} />
            ) : (
              <Text style={{ fontSize: 20, color }}>🏠</Text>
            ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name="map.fill" tintColor={color} resizeMode="scaleAspectFit" style={{ width: 28, height: 28 }} />
            ) : (
              <Text style={{ fontSize: 20, color }}>🗺️</Text>
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name="person.fill" tintColor={color} resizeMode="scaleAspectFit" style={{ width: 28, height: 28 }} />
            ) : (
              <Text style={{ fontSize: 20, color }}>👤</Text>
            ),
        }}
      />
    </Tabs>
  );
}
