import { StyleSheet, Text, View, FlatList, ActivityIndicator, Image, Pressable, Platform } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { IconSymbol } from '@/components/ui/icon-symbol';

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

type Report = {
  id: number;
  image_url: string;
  latitude: number;
  longitude: number;
  issue_type: string | null;
  severity: number | null;
  created_at: string;
};

export default function Profile() {
  const { user, clearSession } = useAuth0();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    if (user?.sub) {
      fetchUserReports();
    }
  }, [user]);

  const fetchUserReports = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${user?.sub}/reports`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.data);
        setReportCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch user reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearSession();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  const renderReportItem = ({ item }: { item: Report }) => (
    <View style={styles.reportCard}>
        <Image source={{ uri: item.image_url }} style={styles.reportImage} />
        <View style={styles.reportInfo}>
            <Text style={styles.reportDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            {item.issue_type && <Text style={styles.reportType}>Type: {item.issue_type}</Text>}
            <Text style={styles.reportLocation}>
                {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
        </View>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Please log in to view your profile.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
        <View style={styles.header}>
            {user.picture ? (
                <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <IconSymbol size={40} name="person.fill" color="#fff" />
                </View>
            )}
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name || 'User Profile'}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.statsText}>Total Reports: {reportCount}</Text>
            </View>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <IconSymbol size={20} name="rectangle.portrait.and.arrow.right" color="#ff4444" />
            </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Your Reports</Text>
        
        {loading ? (
            <ActivityIndicator size="large" color="#635bff" style={{ marginTop: 20 }} />
        ) : reports.length === 0 ? (
            <View style={styles.emptyState}>
                <IconSymbol size={48} name="tray" color="#666" />
                <Text style={styles.emptyText}>You haven't submitted any reports yet.</Text>
            </View>
        ) : (
            <FlatList
                data={reports}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderReportItem}
                contentContainerStyle={styles.listContainer}
            />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Dark theme to match login screen
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 2,
  },
  statsText: {
    fontSize: 12,
    color: '#635bff',
    fontWeight: 'bold',
    marginTop: 6,
  },
  logoutButton: {
    padding: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    margin: 20,
    marginBottom: 10,
  },
  listContainer: {
    padding: 15,
  },
  reportCard: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  reportImage: {
    width: 100,
    height: 100,
  },
  reportInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  reportDate: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reportType: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  reportLocation: {
    color: '#666',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 10,
  }
});
