import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { getAllUsers, updateCoins, banUser, unbanUser } from '../services/userService';
import { getAllCampaigns } from '../services/campaignService';

// ── Brand colours ─────────────────────────────────────────────────────────────
const RED      = '#E53935';
const RED_DARK = '#B71C1C';
const RED_LIGHT = '#FFEBEE';
const WHITE    = '#FFFFFF';
const GRAY_BG  = '#F5F5F5';
const GRAY_100 = '#F3F4F6';
const GRAY_300 = '#D1D5DB';
const GRAY_500 = '#6B7280';
const GRAY_800 = '#1F2937';
const GREEN    = '#10B981';
const AMBER    = '#F59E0B';
const BLUE     = '#3B82F6';

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <MaterialIcons name={icon} size={26} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── User row card ─────────────────────────────────────────────────────────────
function UserCard({ item, onUpdateCoins, onToggleBan, onSendWarning }) {
  const [customAmount, setCustomAmount] = useState('');
  const [applying, setApplying] = useState(false);

  const applyCustom = async () => {
    const parsed = parseInt(customAmount, 10);
    if (isNaN(parsed) || parsed === 0) {
      Alert.alert('Invalid', 'Enter a non-zero integer (e.g. 50 or -50).');
      return;
    }
    setApplying(true);
    await onUpdateCoins(item.email, parsed);
    setCustomAmount('');
    setApplying(false);
  };

  return (
    <View style={styles.userCard}>
      {/* ── Header row ── */}
      <View style={styles.userCardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(item.name || item.email || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.userIdRow}>
            <Text style={styles.userIdBadge}>
              #{item.userId ?? '------'}
            </Text>
            <View style={[styles.statusBadge, item.isBanned ? styles.statusBanned : styles.statusActive]}>
              <Text style={styles.statusBadgeText}>
                {item.isBanned ? '🚫 Banned' : '✅ Active'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName} numberOfLines={1}>{item.name || 'Unnamed User'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        </View>
      </View>

      {/* ── Coins row ── */}
      <View style={styles.coinsRow}>
        <MaterialIcons name="monetization-on" size={18} color={AMBER} />
        <Text style={styles.coinsText}>{item.coins ?? 0} coins</Text>
      </View>

      <View style={styles.divider} />

      {/* ── ±100 Coins ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnGreen]}
          onPress={() => onUpdateCoins(item.email, 100)}
        >
          <MaterialIcons name="add" size={16} color={WHITE} />
          <Text style={styles.btnText}>100</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnRed]}
          onPress={() => onUpdateCoins(item.email, -100)}
        >
          <MaterialIcons name="remove" size={16} color={WHITE} />
          <Text style={styles.btnText}>100</Text>
        </TouchableOpacity>
      </View>

      {/* ── Custom amount ── */}
      <View style={styles.customRow}>
        <TextInput
          style={styles.customInput}
          placeholder="Custom amount (e.g. -50)"
          placeholderTextColor={GRAY_500}
          keyboardType="numeric"
          value={customAmount}
          onChangeText={setCustomAmount}
        />
        <TouchableOpacity
          style={[styles.btn, styles.btnAmber, { flex: 0, paddingHorizontal: 16 }]}
          onPress={applyCustom}
          disabled={applying}
        >
          {applying
            ? <ActivityIndicator size="small" color={WHITE} />
            : <Text style={styles.btnText}>Apply</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Ban / Warn ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btn, item.isBanned ? styles.btnBlue : styles.btnDarkRed, { flex: 1 }]}
          onPress={() => onToggleBan(item.email, item.isBanned)}
        >
          <MaterialIcons
            name={item.isBanned ? 'lock-open' : 'block'}
            size={16}
            color={WHITE}
          />
          <Text style={styles.btnText}>{item.isBanned ? 'Unban User' : 'Ban User'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnGray, { flex: 1 }]}
          onPress={() => onSendWarning(item)}
        >
          <MaterialIcons name="warning" size={16} color={WHITE} />
          <Text style={styles.btnText}>Warning</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const insets = useSafeAreaInsets();

  const [users, setUsers]           = useState([]);
  const [campaigns, setCampaigns]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [usersData, campaignsData] = await Promise.all([
        getAllUsers(),
        getAllCampaigns(),
      ]);
      setUsers(usersData);
      setCampaigns(campaignsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch admin data. Check Firestore rules.');
      console.error('[AdminScreen] fetchAll error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // ── Dashboard stats ─────────────────────────────────────────────────────────
  const totalUsers     = users.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalCoins     = users.reduce((sum, u) => sum + (u.coins ?? 0), 0);

  // ── Search filter (by userId OR email) ─────────────────────────────────────
  const filteredUsers = searchQuery.trim() === ''
    ? users
    : users.filter(u => {
        const q = searchQuery.trim().replace('#', '').toLowerCase();
        const uidStr = String(u.userId ?? '');
        const emailStr = (u.email ?? '').toLowerCase();
        return uidStr.includes(q) || emailStr.includes(q);
      });

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleUpdateCoins = async (email, amount) => {
    try {
      await updateCoins(email, amount);
      const verb = amount > 0 ? `+${amount}` : `${amount}`;
      Alert.alert('✅ Done', `${verb} coins applied to ${email}.`);
      fetchAll();
    } catch {
      Alert.alert('Error', 'Failed to update coins.');
    }
  };

  const handleToggleBan = async (email, isBanned) => {
    Alert.alert(
      isBanned ? 'Unban User' : 'Ban User',
      `Are you sure you want to ${isBanned ? 'unban' : 'ban'} ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBanned ? 'Unban' : 'Ban',
          style: isBanned ? 'default' : 'destructive',
          onPress: async () => {
            try {
              isBanned ? await unbanUser(email) : await banUser(email);
              Alert.alert('✅ Done', `User ${isBanned ? 'unbanned' : 'banned'}.`);
              fetchAll();
            } catch {
              Alert.alert('Error', 'Failed to update ban status.');
            }
          },
        },
      ]
    );
  };

  const handleSendWarning = (user) => {
    Alert.alert(
      '⚠️ Send Warning',
      `Send a warning to ${user.name || user.email} (#${user.userId ?? '------'})?\n\nThis is an admin action.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Warning',
          style: 'destructive',
          onPress: () => {
            // In a full implementation this would write to Firestore / send push notification.
            Alert.alert('✅ Warning Sent', `Warning recorded for ${user.email}.`);
          },
        },
      ]
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={RED} />
        <Text style={styles.loadingText}>Loading admin panel…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>

        {/* ══ Header ══ */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSub}>TubeRise Control Centre</Text>
          </View>
          <MaterialIcons name="admin-panel-settings" size={32} color={WHITE} />
        </View>

        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.email}
          renderItem={({ item }) => (
            <UserCard
              item={item}
              onUpdateCoins={handleUpdateCoins}
              onToggleBan={handleToggleBan}
              onSendWarning={handleSendWarning}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[RED]}
              tintColor={RED}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialIcons name="search-off" size={48} color={GRAY_300} />
              <Text style={styles.emptyText}>No users match your search.</Text>
            </View>
          }
          ListHeaderComponent={
            <>
              {/* ══ Dashboard stats ══ */}
              <View style={styles.statsRow}>
                <StatCard
                  icon="people"
                  label="Total Users"
                  value={totalUsers}
                  color={RED}
                />
                <StatCard
                  icon="campaign"
                  label="Active Campaigns"
                  value={activeCampaigns}
                  color={BLUE}
                />
                <StatCard
                  icon="monetization-on"
                  label="Coins in Circulation"
                  value={totalCoins.toLocaleString()}
                  color={AMBER}
                />
              </View>

              {/* ══ Search bar ══ */}
              <View style={styles.searchBar}>
                <MaterialIcons name="search" size={20} color={GRAY_500} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by #userId or email…"
                  placeholderTextColor={GRAY_500}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialIcons name="close" size={18} color={GRAY_500} />
                  </TouchableOpacity>
                )}
              </View>

              {/* ══ User list label ══ */}
              <Text style={styles.sectionLabel}>
                Users ({filteredUsers.length})
              </Text>
            </>
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GRAY_BG,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: GRAY_BG,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: GRAY_500,
    fontSize: 15,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: RED,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: RED_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: GRAY_800,
  },
  statLabel: {
    fontSize: 10,
    color: GRAY_500,
    textAlign: 'center',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: GRAY_800,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: GRAY_500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },

  // List
  listContent: {
    paddingBottom: 40,
  },

  // User card
  userCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  userCardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: RED_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: RED,
  },
  userIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  userIdBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: RED,
    backgroundColor: RED_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusActive: { backgroundColor: '#D1FAE5' },
  statusBanned: { backgroundColor: '#FEE2E2' },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: GRAY_800,
  },
  userEmail: {
    fontSize: 12,
    color: GRAY_500,
    marginTop: 1,
  },
  coinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  coinsText: {
    fontSize: 14,
    fontWeight: '700',
    color: AMBER,
  },
  divider: {
    height: 1,
    backgroundColor: GRAY_100,
    marginBottom: 12,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: GRAY_300,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: GRAY_800,
    backgroundColor: GRAY_100,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  btnText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  btnGreen:   { backgroundColor: GREEN },
  btnRed:     { backgroundColor: '#EF4444' },
  btnAmber:   { backgroundColor: AMBER },
  btnDarkRed: { backgroundColor: RED_DARK },
  btnBlue:    { backgroundColor: BLUE },
  btnGray:    { backgroundColor: '#6B7280' },

  // Empty
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: GRAY_500,
    fontSize: 15,
  },
});
