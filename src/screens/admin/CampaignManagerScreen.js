/**
 * CampaignManagerScreen — Admin
 *
 * Lists all campaigns with Pause / Resume / Delete actions.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { mockCampaigns } from '../../data/mockData';

const STATUS_COLORS = {
  active:  { bg: '#D1FAE5', text: Colors.success, dot: Colors.success },
  paused:  { bg: '#FEF3C7', text: Colors.warning, dot: Colors.warning },
  deleted: { bg: '#FEE2E2', text: Colors.admin,   dot: Colors.admin   },
};

export default function CampaignManagerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [campaigns, setCampaigns] = useState(
    mockCampaigns.map(c => ({ ...c, adminStatus: 'active' }))
  );

  const updateStatus = (id, status) =>
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, adminStatus: status } : c));

  const handlePause = (c) => {
    if (c.adminStatus === 'paused') {
      Alert.alert('Resume Campaign', `Resume "${c.channelName}"?`, [
        { text: 'Resume', onPress: () => updateStatus(c.id, 'active') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Pause Campaign', `Pause "${c.channelName}"?`, [
        { text: 'Pause', onPress: () => updateStatus(c.id, 'paused') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleDelete = (c) => {
    Alert.alert('Delete Campaign', `Permanently delete "${c.channelName}"? This cannot be undone.`, [
      {
        text: 'Delete', style: 'destructive',
        onPress: () => updateStatus(c.id, 'deleted'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const active  = campaigns.filter(c => c.adminStatus !== 'deleted');
  const deleted = campaigns.filter(c => c.adminStatus === 'deleted');

  const renderCampaign = (c) => {
    const pct = Math.min(100, Math.round((c.progress.views / c.targets.views) * 100));
    const sc = STATUS_COLORS[c.adminStatus] ?? STATUS_COLORS.active;

    return (
      <View key={c.id} style={[styles.card, c.adminStatus === 'deleted' && styles.cardDeleted]}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{c.channelName.charAt(0)}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.cardTitle} numberOfLines={1}>{c.channelName}</Text>
            <Text style={styles.cardOwner}>Budget: {c.budget?.toLocaleString() ?? '—'} 🪙</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
            <Text style={[styles.statusText, { color: sc.text }]}>
              {c.adminStatus.charAt(0).toUpperCase() + c.adminStatus.slice(1)}
            </Text>
          </View>
        </View>

        {/* Progress */}
        {c.adminStatus !== 'deleted' && (
          <View style={styles.progressSection}>
            <View style={styles.progressMeta}>
              <Text style={styles.progressLabel}>Views progress</Text>
              <Text style={styles.progressCount}>{c.progress.views}/{c.targets.views}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${pct}%` }]} />
            </View>
          </View>
        )}

        {/* Task types */}
        <View style={styles.typePills}>
          {c.taskTypes?.map(t => (
            <View key={t} style={styles.pill}>
              <Text style={styles.pillText}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        {c.adminStatus !== 'deleted' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: c.adminStatus === 'paused' ? '#D1FAE5' : '#FEF3C7' }]}
              onPress={() => handlePause(c)}
            >
              <Text style={[styles.actionBtnText, { color: c.adminStatus === 'paused' ? Colors.success : Colors.warning }]}>
                {c.adminStatus === 'paused' ? '▶ Resume' : '⏸ Pause'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.adminLight }]}
              onPress={() => handleDelete(c)}
            >
              <Text style={[styles.actionBtnText, { color: Colors.admin }]}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campaign Manager</Text>
        <Text style={styles.headerCount}>{active.length} active</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Active Campaigns ({active.length})</Text>
        {active.map(renderCampaign)}

        {deleted.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Deleted ({deleted.length})</Text>
            {deleted.map(renderCampaign)}
          </>
        )}
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

  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 16, marginBottom: 10 },

  card: {
    backgroundColor: Colors.white, borderRadius: 16, marginBottom: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  cardDeleted: { opacity: 0.5 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontWeight: '800', fontSize: 18 },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cardOwner: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  progressSection: { marginBottom: 12 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: Colors.textSecondary },
  progressCount: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary },
  progressTrack: { height: 6, backgroundColor: Colors.medGray, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },

  typePills: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  pill: { backgroundColor: Colors.lightGray, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textTransform: 'capitalize' },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
});
