import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { FontSize } from '../theme/typography';
import { mockCampaigns } from '../data/mockData';

export default function CampaignDetailScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const campaign = mockCampaigns[0];
  const progressPct = Math.min(100, Math.round((campaign.progress.views / campaign.targets.views) * 100));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* White Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campaign Detail</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusDot}>●</Text>
          <Text style={styles.statusText}>Live</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Campaign Card */}
        <View style={styles.campaignCard}>
          <View style={styles.channelRow}>
            <View style={styles.channelAvatar}>
              <Text style={styles.channelAvatarText}>M</Text>
            </View>
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>{campaign.channelName}</Text>
              <Text style={styles.startTime}>Started Mar 1, 2024 at 8:00 AM</Text>
            </View>
          </View>

          {/* Type badges */}
          <View style={styles.typeBadges}>
            {campaign.type.map(t => (
              <View key={t} style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {t === 'watch' ? '▶ Watch' : t === 'subscribe' ? '🔔 Subscribe' : t === 'like' ? '👍 Like' : '💬 Comment'}
                </Text>
              </View>
            ))}
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Views Progress</Text>
              <Text style={styles.progressCount}>{campaign.progress.views} / {campaign.targets.views}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressPct}>{progressPct}% complete</Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Subscriber Progress</Text>
              <Text style={styles.progressCount}>{campaign.progress.subscribers} / {campaign.targets.subscribers}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, styles.progressBarOrange,
                { width: `${Math.min(100, Math.round(campaign.progress.subscribers / campaign.targets.subscribers * 100))}%` }]} />
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Spent', value: '2,450 🪙', icon: '💰' },
            { label: 'Unique Users', value: new Set(campaign.participants.map(p => p.id)).size.toString(), icon: '👥' },
            { label: 'Watch Time', value: '60s', icon: '⏱' },
            { label: 'Status', value: 'Active', icon: '✅' },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statCardIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Participants */}
        <View style={styles.participantsSection}>
          <Text style={styles.participantsTitle}>Participated Users</Text>
          {campaign.participants.map(p => (
            <View key={p.id} style={styles.participantRow}>
              <View style={styles.participantAvatar}>
                <Text style={styles.participantAvatarText}>{p.name.charAt(0)}</Text>
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{p.name}</Text>
                <Text style={styles.participantTime}>{p.timeAgo}</Text>
              </View>
              <TouchableOpacity style={styles.menuBtn}>
                <Text style={styles.menuIcon}>⋮</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  /* White Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#dcfce7', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5, gap: 4,
  },
  statusDot: { color: Colors.success, fontSize: 10 },
  statusText: { fontSize: 12, fontWeight: '700', color: Colors.success },

  /* Campaign Card */
  campaignCard: {
    backgroundColor: Colors.white, borderRadius: 16, marginHorizontal: 16,
    marginTop: 16, padding: 18, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  channelAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  channelAvatarText: { color: Colors.white, fontWeight: '800', fontSize: 22 },
  channelInfo: {},
  channelName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  startTime: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  typeBadges: { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  typeBadge: {
    backgroundColor: Colors.lightGray, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  progressSection: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  progressCount: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  progressTrack: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  progressBarOrange: { backgroundColor: Colors.warning },
  progressPct: { fontSize: 12, color: Colors.textSecondary, marginTop: 5 },

  /* Stats Grid */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 10, marginTop: 12 },
  statCard: {
    width: '50%', padding: 6,
  },
  statCardContent: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, alignItems: 'center', elevation: 1,
  },
  statCardIcon: { fontSize: 22, marginBottom: 6, textAlign: 'center' },
  statValue: {
    fontSize: 16, fontWeight: '800', color: Colors.textPrimary,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, textAlign: 'center',
    elevation: 1,
  },
  statLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },

  /* Participants */
  participantsSection: {
    backgroundColor: Colors.white, borderRadius: 16, marginHorizontal: 16,
    marginTop: 14, padding: 16, elevation: 1,
  },
  participantsTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  participantRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  participantAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.blue,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  participantAvatarText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  participantTime: { fontSize: 12, color: Colors.textSecondary },
  menuBtn: { padding: 8 },
  menuIcon: { fontSize: 18, color: Colors.textSecondary },
});
