/**
 * AdminDashboard — Overview tab
 *
 * Shows high-level platform stats: users, coins, campaigns, tasks.
 * Navigation: bottom tab bar for Users / Campaigns / Activity.
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { mockUsers, mockCampaigns, mockTasks } from '../../data/mockData';

const totalCoins = mockUsers.reduce((a, u) => a + u.coinBalance, 0);
const bannedCount = mockUsers.filter(u => u.isBanned).length;
const warnedCount = mockUsers.filter(u => u.warningCount > 0).length;

function StatCard({ icon, value, label, color = Colors.primary }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statCardIcon}>{icon}</Text>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboard({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Admin Panel</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.adminPill}>
            <Text style={styles.adminPillText}>🛡 Admin</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Platform Overview */}
        <Text style={styles.sectionLabel}>Platform Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="👥" value={mockUsers.length} label="Total Users" color={Colors.primary} />
          <StatCard icon="🚀" value={mockCampaigns.length} label="Campaigns" color={Colors.subscribe} />
          <StatCard icon="🪙" value={totalCoins.toLocaleString()} label="Coins Distributed" color={Colors.admin} />
          <StatCard icon="📋" value={mockTasks.length} label="Total Tasks" color={Colors.comment} />
          <StatCard icon="⚠️" value={warnedCount} label="Warned Users" color={Colors.warning} />
          <StatCard icon="🚫" value={bannedCount} label="Banned Users" color={Colors.error} />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: '👥', label: 'Manage Users', screen: 'AdminUsers', color: Colors.primary },
            { icon: '🚀', label: 'Campaigns', screen: 'AdminCampaigns', color: Colors.subscribe },
            { icon: '📋', label: 'Activity Log', screen: 'AdminActivity', color: Colors.comment },
          ].map(a => (
            <TouchableOpacity
              key={a.screen}
              style={[styles.actionCard, { borderColor: a.color + '40' }]}
              onPress={() => navigation.navigate(a.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBg, { backgroundColor: a.color + '18' }]}>
                <Text style={styles.actionIcon}>{a.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Text style={[styles.actionArrow, { color: a.color }]}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Users Preview */}
        <Text style={styles.sectionLabel}>Recent Users</Text>
        <View style={styles.listCard}>
          {mockUsers.slice(0, 4).map((u, i) => (
            <View key={u.id} style={[styles.userRow, i < 3 && styles.userRowBorder]}>
              <View style={[styles.userAvatar, u.isBanned && styles.userAvatarBanned]}>
                <Text style={styles.userAvatarText}>{u.displayName.charAt(0)}</Text>
              </View>
              <View style={styles.userMeta}>
                <Text style={styles.userName}>{u.displayName}</Text>
                <Text style={styles.userEmail}>{u.email}</Text>
              </View>
              <View style={styles.userRight}>
                <Text style={styles.userCoins}>{u.coinBalance.toLocaleString()} 🪙</Text>
                {u.isBanned && <Text style={styles.bannedTag}>Banned</Text>}
                {!u.isBanned && u.warningCount > 0 && (
                  <Text style={styles.warnTag}>{u.warningCount} ⚠</Text>
                )}
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => navigation.navigate('AdminUsers')}
          >
            <Text style={styles.viewAllText}>View All Users →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerSub: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  adminPill: {
    backgroundColor: Colors.adminLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5,
  },
  adminPillText: { fontSize: 12, fontWeight: '700', color: Colors.admin },
  logoutBtn: { padding: 4 },
  logoutText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  scroll: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 20, marginBottom: 10 },

  /* Stats Grid */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statCard: {
    width: '31%', backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    alignItems: 'center', borderTopWidth: 3, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, borderWidth: 1, borderColor: Colors.border,
  },
  statCardIcon: { fontSize: 22, marginBottom: 6 },
  statCardValue: { fontSize: 20, fontWeight: '800' },
  statCardLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 3, textAlign: 'center' },

  /* Actions */
  actionsGrid: { gap: 10 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 14, padding: 16, borderWidth: 1, elevation: 1, gap: 14,
  },
  actionIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { fontSize: 22 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  actionArrow: { fontSize: 18, fontWeight: '700' },

  /* User list */
  listCard: {
    backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border, elevation: 1,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  userRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarBanned: { backgroundColor: Colors.admin },
  userAvatarText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  userMeta: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  userEmail: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  userRight: { alignItems: 'flex-end', gap: 4 },
  userCoins: { fontSize: 13, fontWeight: '700', color: Colors.subscribe },
  bannedTag: { fontSize: 10, fontWeight: '700', color: Colors.admin, backgroundColor: Colors.adminLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  warnTag: { fontSize: 10, fontWeight: '700', color: Colors.warning, backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },

  viewAllBtn: { padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.divider },
  viewAllText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
