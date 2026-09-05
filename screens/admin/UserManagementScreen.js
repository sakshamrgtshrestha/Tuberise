/**
 * UserManagementScreen — Admin
 *
 * Full user list with:
 *  - Coin balance editor (add / deduct)
 *  - Warn / Ban / Unban controls
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { mockUsers } from '../../data/mockData';

const VIOLATIONS = [
  'Unsubscribed after claiming coins',
  'Unliked video after claiming coins',
  'Deleted comment after claiming coins',
  'Suspicious rapid task completion',
];

export default function UserManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState(mockUsers);
  const [coinInputs, setCoinInputs] = useState({});
  const [search, setSearch] = useState('');

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const updateUser = (id, changes) =>
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...changes } : u));

  const handleAddCoins = (user) => {
    const amt = parseInt(coinInputs[user.id] || '0', 10);
    if (!amt || amt <= 0) { Alert.alert('Invalid amount'); return; }
    updateUser(user.id, { coinBalance: user.coinBalance + amt });
    setCoinInputs(p => ({ ...p, [user.id]: '' }));
    Alert.alert('✅ Done', `Added ${amt} coins to ${user.displayName}`);
  };

  const handleDeductCoins = (user) => {
    const amt = parseInt(coinInputs[user.id] || '0', 10);
    if (!amt || amt <= 0) { Alert.alert('Invalid amount'); return; }
    if (amt > user.coinBalance) { Alert.alert('Insufficient balance'); return; }
    updateUser(user.id, { coinBalance: user.coinBalance - amt });
    setCoinInputs(p => ({ ...p, [user.id]: '' }));
    Alert.alert('✅ Done', `Deducted ${amt} coins from ${user.displayName}`);
  };

  const handleWarn = (user) => {
    Alert.alert('Issue Warning', 'Select violation:', [
      ...VIOLATIONS.map(v => ({
        text: v,
        onPress: () => {
          const newCount = Math.min(2, user.warningCount + 1);
          updateUser(user.id, { warningCount: newCount, isBanned: newCount >= 2 });
          Alert.alert('⚠️ Warning Issued', `${user.displayName} now has ${newCount}/2 warnings`);
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleBan = (user) => {
    Alert.alert('Ban User', `Permanently ban ${user.displayName}?`, [
      { text: 'Ban', style: 'destructive', onPress: () => updateUser(user.id, { isBanned: true }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleUnban = (user) => {
    updateUser(user.id, { isBanned: false, warningCount: 0 });
    Alert.alert('✅ Unbanned', `${user.displayName} has been unbanned`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerCount}>{users.length} users</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍  Search users…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filtered.map(u => (
          <View key={u.id} style={[styles.userCard, u.isBanned && styles.userCardBanned]}>
            {/* User Info */}
            <View style={styles.userTop}>
              <View style={[styles.avatar, { backgroundColor: u.isBanned ? Colors.admin : Colors.primary }]}>
                <Text style={styles.avatarText}>{u.displayName.charAt(0)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{u.displayName}</Text>
                <Text style={styles.userEmail}>{u.email}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.coinBadge}>
                    <Text style={styles.coinBadgeText}>🪙 {u.coinBalance.toLocaleString()}</Text>
                  </View>
                  {u.isBanned && (
                    <View style={styles.bannedBadge}>
                      <Text style={styles.bannedBadgeText}>🚫 Banned</Text>
                    </View>
                  )}
                  {!u.isBanned && u.warningCount > 0 && (
                    <View style={styles.warnBadge}>
                      <Text style={styles.warnBadgeText}>⚠️ {u.warningCount}/2</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Coin Editor */}
            <View style={styles.coinEditor}>
              <Text style={styles.editorLabel}>Adjust Coins</Text>
              <View style={styles.coinEditorRow}>
                <TextInput
                  style={styles.coinInput}
                  placeholder="Amount"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={coinInputs[u.id] || ''}
                  onChangeText={v => setCoinInputs(p => ({ ...p, [u.id]: v }))}
                />
                <TouchableOpacity
                  style={[styles.coinBtn, { backgroundColor: Colors.success }]}
                  onPress={() => handleAddCoins(u)}
                >
                  <Text style={styles.coinBtnText}>+ Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.coinBtn, { backgroundColor: Colors.admin }]}
                  onPress={() => handleDeductCoins(u)}
                >
                  <Text style={styles.coinBtnText}>− Deduct</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              {!u.isBanned ? (
                <>
                  <TouchableOpacity style={styles.warnBtn} onPress={() => handleWarn(u)}>
                    <Text style={styles.warnBtnText}>⚠️ Warn</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.banBtn} onPress={() => handleBan(u)}>
                    <Text style={styles.banBtnText}>🚫 Ban</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.unbanBtn} onPress={() => handleUnban(u)}>
                  <Text style={styles.unbanBtnText}>✅ Unban User</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 12 },
  backIcon: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  headerCount: {
    fontSize: 12, fontWeight: '700', color: Colors.primary,
    backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },

  searchRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchInput: {
    backgroundColor: Colors.lightGray, borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 12, fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },

  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  userCard: {
    backgroundColor: Colors.white, borderRadius: 16, marginBottom: 14,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  userCardBanned: { borderColor: Colors.admin + '60', backgroundColor: '#FFF5F5' },

  userTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontWeight: '800', fontSize: 18 },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  userEmail: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  coinBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  coinBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  bannedBadge: { backgroundColor: Colors.adminLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  bannedBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.admin },
  warnBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  warnBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.warning },

  coinEditor: {
    backgroundColor: Colors.lightGray, borderRadius: 12, padding: 12, marginBottom: 12,
  },
  editorLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  coinEditorRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  coinInput: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: Colors.textPrimary,
  },
  coinBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  coinBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },

  actionRow: { flexDirection: 'row', gap: 10 },
  warnBtn: {
    flex: 1, backgroundColor: '#FEF3C7', borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A',
  },
  warnBtnText: { fontSize: 13, fontWeight: '700', color: Colors.warning },
  banBtn: {
    flex: 1, backgroundColor: Colors.adminLight, borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#FECACA',
  },
  banBtnText: { fontSize: 13, fontWeight: '700', color: Colors.admin },
  unbanBtn: {
    flex: 1, backgroundColor: '#D1FAE5', borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0',
  },
  unbanBtnText: { fontSize: 13, fontWeight: '700', color: Colors.success },
});
