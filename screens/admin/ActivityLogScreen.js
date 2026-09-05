/**
 * ActivityLogScreen — Admin
 *
 * Shows all task completions. Admin can flag suspicious ones.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { mockTasks, mockUsers } from '../../data/mockData';

// Generate mock activity log from tasks + users
const generateLog = () => {
  const log = [];
  let id = 1;
  mockUsers.forEach(u => {
    mockTasks.slice(0, 3).forEach(t => {
      log.push({
        id: id++,
        userId: u.id,
        userName: u.displayName,
        taskType: t.type,
        videoTitle: t.videoTitle,
        coinsEarned: t.coinsReward,
        duration: t.watchTimeRequired,
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
        isSuspicious: Math.random() < 0.15,
        isFlagged: false,
      });
    });
  });
  return log.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const TYPE_COLORS = {
  watch:     Colors.watch,
  subscribe: Colors.subscribe,
  like:      Colors.like,
  comment:   Colors.comment,
};

const TYPE_ICONS = { watch: '▶', subscribe: '🔔', like: '👍', comment: '💬' };

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ActivityLogScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [log, setLog] = useState(generateLog);
  const [filter, setFilter] = useState('all'); // 'all' | 'suspicious' | 'flagged'

  const toggleFlag = (id) => {
    setLog(prev => prev.map(e => e.id === id ? { ...e, isFlagged: !e.isFlagged } : e));
  };

  const handleWarnFromLog = (entry) => {
    Alert.alert('Flag & Warn', `Issue a warning to ${entry.userName} for suspicious activity?`, [
      { text: 'Warn', style: 'destructive', onPress: () => {
        toggleFlag(entry.id);
        Alert.alert('✅ Warning issued', `${entry.userName} has been warned.`);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const displayed = log.filter(e => {
    if (filter === 'suspicious') return e.isSuspicious;
    if (filter === 'flagged') return e.isFlagged;
    return true;
  });

  const suspCount = log.filter(e => e.isSuspicious).length;
  const flagCount = log.filter(e => e.isFlagged).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Log</Text>
        <View style={styles.suspBadge}>
          <Text style={styles.suspBadgeText}>⚠ {suspCount} suspicious</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {[
          { key: 'all',        label: `All (${log.length})` },
          { key: 'suspicious', label: `Suspicious (${suspCount})` },
          { key: 'flagged',    label: `Flagged (${flagCount})` },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {displayed.map(entry => (
          <View
            key={entry.id}
            style={[
              styles.logCard,
              entry.isSuspicious && styles.logCardSuspicious,
              entry.isFlagged && styles.logCardFlagged,
            ]}
          >
            <View style={styles.logTop}>
              {/* Task type icon */}
              <View style={[styles.typeIcon, { backgroundColor: (TYPE_COLORS[entry.taskType] ?? Colors.primary) + '20' }]}>
                <Text style={styles.typeIconText}>{TYPE_ICONS[entry.taskType] ?? '?'}</Text>
              </View>

              <View style={styles.logMeta}>
                <Text style={styles.logUser}>{entry.userName}</Text>
                <Text style={styles.logVideo} numberOfLines={1}>{entry.videoTitle}</Text>
                <Text style={styles.logTime}>{formatDate(entry.timestamp)}</Text>
              </View>

              <View style={styles.logRight}>
                <Text style={[styles.logCoins, { color: TYPE_COLORS[entry.taskType] ?? Colors.primary }]}>
                  +{entry.coinsEarned} 🪙
                </Text>
                {entry.isSuspicious && (
                  <View style={styles.suspTag}>
                    <Text style={styles.suspTagText}>⚠ Auto-flagged</Text>
                  </View>
                )}
                {entry.isFlagged && (
                  <View style={styles.manualFlagTag}>
                    <Text style={styles.manualFlagTagText}>🚩 Admin</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Admin actions */}
            <View style={styles.logActions}>
              <TouchableOpacity
                style={[styles.logBtn, entry.isFlagged ? styles.logBtnFlagged : styles.logBtnNormal]}
                onPress={() => toggleFlag(entry.id)}
              >
                <Text style={[styles.logBtnText, entry.isFlagged && { color: Colors.admin }]}>
                  {entry.isFlagged ? '🚩 Unflag' : '🚩 Flag'}
                </Text>
              </TouchableOpacity>
              {entry.isSuspicious && !entry.isFlagged && (
                <TouchableOpacity
                  style={styles.logBtnWarn}
                  onPress={() => handleWarnFromLog(entry)}
                >
                  <Text style={styles.logBtnWarnText}>⚠ Warn User</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {displayed.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No entries for this filter</Text>
          </View>
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
  suspBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  suspBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.warning },

  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filterTab: {
    flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.lightGray,
    alignItems: 'center',
  },
  filterTabActive: { backgroundColor: Colors.primary },
  filterTabText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  filterTabTextActive: { color: Colors.white, fontWeight: '700' },

  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  logCard: {
    backgroundColor: Colors.white, borderRadius: 14, marginBottom: 10, padding: 14,
    borderWidth: 1, borderColor: Colors.border, elevation: 1,
  },
  logCardSuspicious: { borderColor: Colors.warning + '60', backgroundColor: '#FFFBEB' },
  logCardFlagged: { borderColor: Colors.admin + '60', backgroundColor: '#FFF5F5' },

  logTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  typeIconText: { fontSize: 18 },
  logMeta: { flex: 1 },
  logUser: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  logVideo: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  logTime: { fontSize: 10, color: Colors.textMuted, marginTop: 3 },
  logRight: { alignItems: 'flex-end', gap: 4 },
  logCoins: { fontSize: 13, fontWeight: '800' },
  suspTag: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  suspTagText: { fontSize: 9, fontWeight: '700', color: Colors.warning },
  manualFlagTag: { backgroundColor: Colors.adminLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  manualFlagTagText: { fontSize: 9, fontWeight: '700', color: Colors.admin },

  logActions: { flexDirection: 'row', gap: 8 },
  logBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1 },
  logBtnNormal: { backgroundColor: Colors.lightGray, borderColor: Colors.border },
  logBtnFlagged: { backgroundColor: Colors.adminLight, borderColor: '#FECACA' },
  logBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  logBtnWarn: {
    flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center',
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
  },
  logBtnWarnText: { fontSize: 12, fontWeight: '700', color: Colors.warning },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
});
