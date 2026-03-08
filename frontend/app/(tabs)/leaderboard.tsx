import React from 'react';
import { StyleSheet, Text, View, FlatList, Image, SafeAreaView } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Type representing a user on the leaderboard.
// This matches what we will eventually fetch from the API.
type LeaderboardUser = {
  id: string;
  name: string;
  avatar?: string;
  reportCount: number;
  rank: number;
};

// Mock data representing the top users.
const MOCK_LEADERBOARD_DATA: LeaderboardUser[] = [
  {
    id: 'user_1',
    name: 'Sarah Jenkins',
    avatar: 'https://i.pravatar.cc/150?u=sarah',
    reportCount: 42,
    rank: 1,
  },
  {
    id: 'user_2',
    name: 'Michael Chen',
    avatar: 'https://i.pravatar.cc/150?u=michael',
    reportCount: 38,
    rank: 2,
  },
  {
    id: 'user_3',
    name: 'Alex Rivera',
    avatar: 'https://i.pravatar.cc/150?u=alex',
    reportCount: 31,
    rank: 3,
  },
  {
    id: 'user_4',
    name: 'Emily Davis',
    avatar: 'https://i.pravatar.cc/150?u=emily',
    reportCount: 27,
    rank: 4,
  },
  {
    id: 'user_5',
    name: 'David Wilson',
    reportCount: 15,
    rank: 5,
  },
  {
    id: 'user_6',
    name: 'Jessica Taylor',
    avatar: 'https://i.pravatar.cc/150?u=jess',
    reportCount: 12,
    rank: 6,
  },
];

export default function Leaderboard() {
  const renderItem = ({ item }: { item: LeaderboardUser }) => {
    // Top 3 get special metallic colors
    let rankColor = '#888'; // Default rank color
    if (item.rank === 1) rankColor = '#FFD700'; // Gold
    if (item.rank === 2) rankColor = '#C0C0C0'; // Silver
    if (item.rank === 3) rankColor = '#CD7F32'; // Bronze

    return (
      <View style={styles.card}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, { color: rankColor }]}>
            #{item.rank}
          </Text>
        </View>

        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.userInfo}>
          <Text style={styles.nameText} numberOfLines={1}>
            {item.name}
          </Text>
        </View>

        <View style={styles.statContainer}>
          <View style={styles.statBadge}>
            <Text style={styles.statNumber}>{item.reportCount}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <IconSymbol size={24} name="sparkles" color="#2DD4BF" />
            </View>
            <Text style={styles.headerTitle}>Leaderboard</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Top Reporters</Text>
          </View>
        </View>

        <View style={styles.listWrapper}>
          <FlatList
            data={MOCK_LEADERBOARD_DATA}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090b', // Base dark background
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40, // Extra padding for status bar if not handled by SafeAreaView perfectly
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#111827', // Darker offset background for the icon
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  activeBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)', // #14b8a6 with 10% opacity
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  activeBadgeText: {
    color: '#2DD4BF', // Teal accent
    fontSize: 12,
    fontWeight: '600',
  },
  listWrapper: {
    flex: 1,
    padding: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f11', // Very dark gray, slightly lighter than background
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a', // Subtle dashed border look can be achieved with a solid subtle border here, as dashed per-side is tricky in RN without SVG
    borderStyle: 'dashed', // Applying dashed border explicitly as requested
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarInitials: {
    color: '#a1a1aa',
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  statContainer: {
    marginLeft: 12,
  },
  statBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2DD4BF',
  },
  statLabel: {
    fontSize: 10,
    color: '#a1a1aa',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
