import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Auth0, { useAuth0 } from "react-native-auth0";
import { saveUser } from "@/lib/api";
import { decodeJwtPayload } from "@/lib/jwt";

const auth0Instance = new Auth0({
  domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN!,
  clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!,
});

// ─── Main Login Screen ────────────────────────────────────────────────────────

export default function Login() {
  const { authorize, getCredentials } = useAuth0();
  const [view, setView] = useState<'login' | 'forgot' | 'signup'>('login');

  const postAuth = async (idToken: string | undefined) => {
    if (idToken) {
      const payload = decodeJwtPayload(idToken);
      if (payload?.sub && payload?.email) {
        try { await saveUser(payload.sub, payload.email); } catch {}
      }
    }
    router.replace("/(tabs)");
  };

  if (view === 'forgot') {
    return <ForgotPassword onBack={() => setView('login')} />;
  }

  if (view === 'signup') {
    return <SignUp authorize={authorize} getCredentials={getCredentials} postAuth={postAuth} onBack={() => setView('login')} />;
  }

  return (
    <LoginForm
      authorize={authorize}
      getCredentials={getCredentials}
      postAuth={postAuth}
      onForgot={() => setView('forgot')}
      onSignUp={() => setView('signup')}
    />
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────

function LoginForm({
  authorize,
  getCredentials,
  postAuth,
  onForgot,
  onSignUp,
}: {
  authorize: Function;
  getCredentials: Function;
  postAuth: (idToken: string | undefined) => Promise<void>;
  onForgot: () => void;
  onSignUp: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const runOAuth = async (action: string, fn: () => Promise<any>) => {
    if (loading) return;
    setLoading(action);
    try {
      const result = await fn();
      await postAuth(result?.idToken);
    } catch (e: any) {
      if (!e?.message?.includes('cancel')) {
        Alert.alert('Sign in failed', e?.message ?? 'Please try again.');
      }
    } finally {
      setLoading(null);
    }
  };

  const signIn = async () => {
    if (loading) return;
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your username/email and password.');
      return;
    }
    setLoading('signin');
    try {
      const credentials = await auth0Instance.auth.passwordRealm({
        username: username.trim(),
        password: password.trim(),
        realm: 'Username-Password-Authentication',
        scope: 'openid profile email',
      });
      // Save credentials so the useAuth0 hook picks up the session.
      // TTL: 30 days if "Remember me" is checked, otherwise 1 day.
      const ttlSeconds = rememberMe ? 30 * 24 * 3600 : 86400;
      await auth0Instance.credentialsManager.saveCredentials({
        accessToken: credentials.accessToken,
        idToken: credentials.idToken,
        tokenType: credentials.tokenType,
        scope: credentials.scope ?? 'openid profile email',
        expiresAt: Math.floor(Date.now() / 1000) + (credentials.expiresIn ?? ttlSeconds),
        refreshToken: credentials.refreshToken,
      });
      // Trigger hook state update so _layout.tsx sees the user
      await getCredentials();
      await postAuth(credentials.idToken);
    } catch (e: any) {
      const msg = e?.json?.error_description ?? e?.message ?? 'Invalid username or password.';
      Alert.alert('Sign in failed', msg);
    } finally {
      setLoading(null);
    }
  };

  const signInGoogle = () => runOAuth('google', () =>
    authorize({ connection: 'google-oauth2' })
  );

  const signInDifferent = () => runOAuth('different', () =>
    authorize({ additionalParameters: { prompt: 'login' } })
  );

  return (
    <View style={s.screen}>

      <View style={s.header}>
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in to your account</Text>
      </View>

      <View style={s.form}>

        {/* Username */}
        <View style={s.field}>
          <Text style={s.label}>Username or email</Text>
          <View style={s.inputWrap}>
            <Text style={s.icon}>✉</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor="#4b5563"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Password */}
        <View style={s.field}>
          <View style={s.labelRow}>
            <Text style={s.label}>Password</Text>
            <TouchableOpacity onPress={onForgot}>
              <Text style={s.forgotLink}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <View style={s.inputWrap}>
            <Text style={s.icon}>🔒</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your password"
              placeholderTextColor="#4b5563"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
              <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Remember me */}
        <TouchableOpacity style={s.checkRow} onPress={() => setRememberMe(v => !v)} activeOpacity={0.7}>
          <View style={[s.checkbox, rememberMe && s.checkboxOn]}>
            {rememberMe && <Text style={s.checkmark}>✓</Text>}
          </View>
          <Text style={s.checkLabel}>Remember me for 30 days</Text>
        </TouchableOpacity>

        {/* Sign in */}
        <Btn label="Sign in  →" loading={loading === 'signin'} disabled={!!loading} onPress={signIn} />

        <Divider />

        {/* Google */}
        <TouchableOpacity
          style={[s.btnOutline, !!loading && s.disabled]}
          onPress={signInGoogle}
          disabled={!!loading}
          activeOpacity={0.8}
        >
          {loading === 'google' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={s.googleG}>G</Text>
              <Text style={s.btnOutlineText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Different account */}
        <TouchableOpacity
          style={[s.btnGhost, !!loading && s.disabled]}
          onPress={signInDifferent}
          disabled={!!loading}
          activeOpacity={0.8}
        >
          {loading === 'different' ? (
            <ActivityIndicator color="#6b7280" />
          ) : (
            <Text style={s.btnGhostText}>Sign in with a different account</Text>
          )}
        </TouchableOpacity>

      </View>

      {/* Sign up */}
      <View style={s.footer}>
        <Text style={s.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={onSignUp} disabled={!!loading}>
          <Text style={s.footerLink}>Sign up</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────

function SignUp({
  authorize,
  getCredentials,
  postAuth,
  onBack,
}: {
  authorize: Function;
  getCredentials: Function;
  postAuth: (idToken: string | undefined) => Promise<void>;
  onBack: () => void;
}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const rules = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter (A–Z)', ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a–z)', ok: /[a-z]/.test(password) },
    { label: 'One number (0–9)', ok: /[0-9]/.test(password) },
    { label: 'One special character (!@#$…)', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const passwordValid = rules.every(r => r.ok);

  const createAccount = async () => {
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (!passwordValid) {
      Alert.alert('Weak password', 'Please meet all password requirements before continuing.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure both passwords are the same.');
      return;
    }
    setLoading(true);
    try {
      await auth0Instance.auth.createUser({
        email: email.trim(),
        username: username.trim(),
        password,
        connection: 'Username-Password-Authentication',
      });
      // Try native sign-in first; fall back to hosted page if Password grant isn't enabled
      try {
        const credentials = await auth0Instance.auth.passwordRealm({
          username: email.trim(),
          password,
          realm: 'Username-Password-Authentication',
          scope: 'openid profile email',
        });
        await auth0Instance.credentialsManager.saveCredentials({
          accessToken: credentials.accessToken,
          idToken: credentials.idToken,
          tokenType: credentials.tokenType,
          scope: credentials.scope ?? 'openid profile email',
          expiresAt: Math.floor(Date.now() / 1000) + (credentials.expiresIn ?? 86400),
          refreshToken: credentials.refreshToken,
        });
        await getCredentials();
        await postAuth(credentials.idToken);
      } catch {
        // Password grant not enabled — open hosted login page with email pre-filled
        const result = await authorize({ login_hint: email.trim() });
        await postAuth(result?.idToken);
      }
    } catch (e: any) {
      // react-native-auth0 surfaces API errors as e.description; fall back through common shapes
      const msg = e?.description ?? e?.json?.message ?? e?.json?.error_description ?? e?.message ?? 'Failed to create account.';
      Alert.alert('Sign up failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0d0d0d' }}
      contentContainerStyle={s.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={onBack} style={s.backBtn}>
        <Text style={s.backText}>← Back to sign in</Text>
      </TouchableOpacity>

      <View style={s.header}>
        <Text style={s.title}>Create account</Text>
        <Text style={s.subtitle}>Sign up with your email and password</Text>
      </View>

      <View style={s.form}>

        <View style={s.field}>
          <Text style={s.label}>Username</Text>
          <View style={s.inputWrap}>
            <Text style={s.icon}>👤</Text>
            <TextInput
              style={s.input}
              placeholder="Choose a username"
              placeholderTextColor="#4b5563"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Email address</Text>
          <View style={s.inputWrap}>
            <Text style={s.icon}>✉</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor="#4b5563"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Password</Text>
          <View style={s.inputWrap}>
            <Text style={s.icon}>🔒</Text>
            <TextInput
              style={s.input}
              placeholder="Create a password"
              placeholderTextColor="#4b5563"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
              <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          {/* Password requirements — only shown once user starts typing */}
          {password.length > 0 && (
            <View style={s.reqList}>
              {rules.map(r => (
                <View key={r.label} style={s.reqRow}>
                  <Text style={[s.reqDot, r.ok && s.reqDotOk]}>{r.ok ? '✓' : '·'}</Text>
                  <Text style={[s.reqText, r.ok && s.reqTextOk]}>{r.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={s.field}>
          <Text style={s.label}>Confirm password</Text>
          <View style={s.inputWrap}>
            <Text style={s.icon}>🔒</Text>
            <TextInput
              style={s.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#4b5563"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <Text style={s.reqMismatch}>Passwords do not match</Text>
          )}
        </View>

        <Btn label="Create account  →" loading={loading} disabled={loading} onPress={createAccount} />

      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={onBack} disabled={loading}>
          <Text style={s.footerLink}>Sign in</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendReset = async () => {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Please enter the email linked to your account.');
      return;
    }
    setLoading(true);
    try {
      await auth0Instance.auth.resetPassword({
        email: email.trim(),
        connection: 'Username-Password-Authentication',
      });
      setSent(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.screen}>

      <TouchableOpacity onPress={onBack} style={s.backBtn}>
        <Text style={s.backText}>← Back to sign in</Text>
      </TouchableOpacity>

      <View style={s.header}>
        <Text style={s.title}>Forgot password?</Text>
        <Text style={s.subtitle}>
          {sent
            ? 'Check your inbox — we sent a password reset link to your email.'
            : "Enter your account email and we'll send you a reset link."}
        </Text>
      </View>

      {!sent ? (
        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>Email address</Text>
            <View style={s.inputWrap}>
              <Text style={s.icon}>✉</Text>
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor="#4b5563"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>
          </View>

          <Btn label="Send reset link" loading={loading} disabled={loading} onPress={sendReset} />
        </View>
      ) : (
        <TouchableOpacity style={s.btnPrimary} onPress={onBack}>
          <Text style={s.btnPrimaryText}>Back to sign in</Text>
        </TouchableOpacity>
      )}

    </View>
  );
}

// ─── Shared small components ──────────────────────────────────────────────────

function Btn({ label, loading, disabled, onPress }: { label: string; loading: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.btnPrimary, disabled && s.disabled]} onPress={onPress} disabled={disabled} activeOpacity={0.85}>
      {loading ? <ActivityIndicator color="#000" /> : <Text style={s.btnPrimaryText}>{label}</Text>}
    </TouchableOpacity>
  );
}

function Divider() {
  return (
    <View style={s.divider}>
      <View style={s.dividerLine} />
      <Text style={s.dividerText}>OR CONTINUE WITH</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    paddingHorizontal: 24,
    justifyContent: "center",
  },

  backBtn:   { position: 'absolute', top: 60, left: 24 },
  backText:  { color: '#6b7280', fontSize: 14 },

  header: { marginBottom: 36 },
  title:    { fontSize: 34, fontWeight: "800", color: "#fff", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#6b7280", lineHeight: 22 },

  form: { gap: 18 },

  field:    { gap: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:    { fontSize: 14, fontWeight: "600", color: "#fff" },
  forgotLink: { fontSize: 13, color: '#6b7280' },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    height: 52,
  },
  icon:    { fontSize: 16, marginRight: 10, color: '#6b7280' },
  input:   { flex: 1, color: '#fff', fontSize: 15 },
  eyeIcon: { fontSize: 16, paddingLeft: 8 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#4b5563',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxOn: { backgroundColor: '#00d4a8', borderColor: '#00d4a8' },
  checkmark:  { color: '#000', fontSize: 12, fontWeight: '800' },
  checkLabel: { color: '#9ca3af', fontSize: 14 },

  btnPrimary:     { backgroundColor: '#00d4a8', height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#000', fontSize: 16, fontWeight: '700' },

  btnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 52, borderRadius: 12, backgroundColor: '#1a1a1a',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  googleG:        { fontSize: 18, fontWeight: '800', color: '#fff' },
  btnOutlineText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  btnGhost:     { alignItems: 'center', paddingVertical: 12 },
  btnGhostText: { color: '#6b7280', fontSize: 14 },

  disabled: { opacity: 0.5 },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2a2a2a' },
  dividerText: { color: '#4b5563', fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },

  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  footerText: { color: '#6b7280', fontSize: 14 },
  footerLink: { color: '#fff', fontSize: 14, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 24, paddingTop: 100, paddingBottom: 48, justifyContent: 'center', flexGrow: 1 },

  reqList:    { marginTop: 10, gap: 6 },
  reqRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqDot:     { fontSize: 14, color: '#4b5563', width: 16 },
  reqDotOk:   { color: '#00d4a8' },
  reqText:    { fontSize: 13, color: '#4b5563' },
  reqTextOk:  { color: '#00d4a8' },
  reqMismatch: { fontSize: 13, color: '#f87171', marginTop: 6 },
});
