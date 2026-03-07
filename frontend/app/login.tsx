import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { router } from 'expo-router';

export default function Login() {
  const { authorize } = useAuth0();

  const login = async () => {
    try {
      const credentials = await authorize();
      if (credentials?.idToken) {
        // Decode the JWT to get user info
        const payload = JSON.parse(atob(credentials.idToken.split('.')[1]));
        // Save user to database
        await fetch('http://10.36.37.112:3001/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: payload.sub, email: payload.email }),
        });
      }
      router.replace('/(tabs)');
    } catch (e) { console.log('login error', e) }
  };

  const switchAccount = async () => {
    try {
      await authorize({ additionalParameters: { prompt: 'login' } });
      router.replace('/(tabs)');
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pothole Reporter</Text>
      <TouchableOpacity style={styles.button} onPress={login}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={switchAccount} style={styles.switchButton}>
        <Text style={styles.switchText}>Sign in with a different account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 40 },
  button: { backgroundColor: '#635bff', padding: 16, borderRadius: 10, width: 200, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchButton: { marginTop: 8 },
  switchText: { color: '#aaa', fontSize: 14, textDecorationLine: 'underline' },
});
