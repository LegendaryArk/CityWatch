import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Auth0, { useAuth0 } from 'react-native-auth0';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const auth0Client = new Auth0({
  domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN!,
  clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!,
});

const C = {
  bg:     '#0d0d0d',
  card:   '#161616',
  border: '#2a2a2a',
  text:   '#ffffff',
  muted:  '#6b7280',
  accent: '#00d4a8',
  danger: '#ef4444',
};

export default function ProfileScreen() {
  const { user } = useAuth0();
  const insets = useSafeAreaInsets();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            // Clear credentials locally — avoids the iOS ASWebAuthenticationSession
            // browser popup that clearSession() triggers
            await auth0Client.credentialsManager.clearCredentials();
          } catch {}
          router.replace('/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This action is irreversible. Contact support to delete your account.');
  };

  // Derive display name and initials from user
  const displayName = user?.name ?? user?.nickname ?? 'User';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const email = user?.email ?? '';

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.pageTitle}>Profile</Text>
      </View>

      {/* Avatar + name */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.avatarName}>{displayName}</Text>
        <Text style={s.avatarEmail}>{email}</Text>
      </View>

      {/* Personal Information */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Personal Information</Text>
        <Text style={s.cardSub}>Your account details.</Text>

        <View style={s.fieldGroup}>
          <Text style={s.label}>Full Name</Text>
          <TextInput
            style={s.input}
            value={displayName}
            editable={false}
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.label}>Username</Text>
          <TextInput
            style={s.input}
            value={user?.nickname ?? 'N/A'}
            editable={false}
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.label}>Email Address</Text>
          <TextInput
            style={[s.input, s.inputDisabled]}
            value={email}
            editable={false}
            placeholderTextColor={C.muted}
          />
          <Text style={s.fieldHint}>Contact support to change your email address.</Text>
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.label}>Bio</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value="CityWatch contributor helping improve local infrastructure."
            editable={false}
            multiline
            numberOfLines={3}
            placeholderTextColor={C.muted}
          />
        </View>
      </View>

      {/* Stats summary */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Activity</Text>
        <Text style={s.cardSub}>Your contribution summary.</Text>
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statValue}>—</Text>
            <Text style={s.statLabel}>REPORTS</Text>
          </View>
          <View style={[s.statItem, s.statBorder]}>
            <Text style={[s.statValue, { color: C.accent }]}>—</Text>
            <Text style={s.statLabel}>RESOLVED</Text>
          </View>
          <View style={s.statItem}>
            <Text style={s.statValue}>—</Text>
            <Text style={s.statLabel}>STREAK</Text>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Sign Out</Text>
        <Text style={s.cardSub}>Sign out of your account on this device.</Text>
        <Text style={[s.cardSub, { marginTop: 6 }]}>You will be redirected to the login page after signing out.</Text>
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Text style={s.signOutBtnText}>{'→  Sign Out'}</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={[s.card, s.dangerCard]}>
        <Text style={s.dangerTitle}>Danger Zone</Text>
        <Text style={s.cardSub}>Irreversible and destructive actions.</Text>

        <View style={s.fieldGroup}>
          <Text style={s.label}>Delete Account</Text>
          <Text style={s.cardSub}>Permanently delete your account and all associated data.</Text>
        </View>

        <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={s.deleteBtnText}>🗑  Delete Account</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  content: { padding: 20 },

  header:    { marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: C.text },

  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: '#00d4a820', borderWidth: 2, borderColor: C.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText:    { fontSize: 28, fontWeight: '800', color: C.accent },
  avatarName:    { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 4 },
  avatarEmail:   { fontSize: 13, color: C.muted },

  card:     { backgroundColor: C.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  cardTitle:{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 },
  cardSub:  { fontSize: 13, color: C.muted, lineHeight: 18 },

  fieldGroup: { marginTop: 16 },
  label:      { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 },
  input:      { backgroundColor: '#1e1e1e', borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 15 },
  inputDisabled: { color: C.muted },
  textArea:   { height: 90, textAlignVertical: 'top' },
  fieldHint:  { fontSize: 12, color: C.muted, marginTop: 6 },

  statsRow:   { flexDirection: 'row', marginTop: 16 },
  statItem:   { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  statValue:  { fontSize: 22, fontWeight: '800', color: C.text },
  statLabel:  { fontSize: 10, color: C.muted, marginTop: 4, letterSpacing: 0.5 },

  signOutBtn:     { marginTop: 16, backgroundColor: '#1e1e1e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  signOutBtnText: { color: C.text, fontWeight: '700', fontSize: 15 },

  dangerCard:  { borderColor: '#ef444440' },
  dangerTitle: { fontSize: 18, fontWeight: '700', color: C.danger, marginBottom: 4 },
  deleteBtn:     { marginTop: 16, backgroundColor: C.danger, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
