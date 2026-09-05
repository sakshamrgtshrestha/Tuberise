import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, Image, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCoins } from '../context/CoinContext';
import { useAuth } from '../context/AuthContext';
import { getUserCampaigns, deleteCampaign } from '../services/campaignService';
import SidebarDrawer from '../components/SidebarDrawer';

const { width: SW } = Dimensions.get('window');
const THUMB_H = Math.round(SW * (9 / 16));
const thumbUrl = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

// ── Type badge config ──────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  watch:     { label: 'View',      color: '#3366FF', bg: '#EEF2FF' },
  like:      { label: 'Like',      color: '#DC2626', bg: '#FEF2F2' },
  subscribe: { label: 'Subscribe', color: '#D97706', bg: '#FFFBEB' },
  comment:   { label: 'Comment',   color: '#7C3AED', bg: '#F5F3FF' },
};

// ── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onDelete }) {
  const { id, type, videoId, currentProgress = 0, totalRequired = 1,
          status, watchTimeRequired, totalCost } = campaign;

  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.watch;
  const pct = Math.min((currentProgress / Math.max(totalRequired, 1)) * 100, 100);
  const isDone = status === 'completed';
  const coinsSpent = totalCost ?? Math.round((totalRequired ?? 0) * (watchTimeRequired ?? 30) * 0.42);

  return (
    <View style={c.card}>
      {/* Thumbnail */}
      <View style={c.thumbWrap}>
        <Image
          source={{ uri: thumbUrl(videoId) }}
          style={c.thumb}
          resizeMode="cover"
        />
        {/* Type badge overlay */}
        <View style={[c.typeBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[c.typeBadgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {/* Status badge */}
        <View style={[c.statusBadge, isDone ? c.statusDone : c.statusActive]}>
          <Text style={c.statusTxt}>{isDone ? 'Completed' : 'Active'}</Text>
        </View>
        
        {/* Delete Button */}
        <TouchableOpacity 
          style={c.deleteBtn} 
          onPress={() => onDelete(id)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="delete" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={c.body}>
        {/* Progress text */}
        <View style={c.progressHeader}>
          <Text style={c.progressLabel}>
            <Text style={c.progressNum}>{currentProgress}</Text>
            <Text style={c.progressOf}> out of </Text>
            <Text style={c.progressNum}>{totalRequired}</Text>
            <Text style={c.progressOf}> completed</Text>
          </Text>
          <Text style={c.pctTxt}>{Math.round(pct)}%</Text>
        </View>

        {/* Progress bar */}
        <View style={c.track}>
          <View style={[c.fill, { width: `${pct}%`, backgroundColor: isDone ? '#10B981' : '#3366FF' }]} />
        </View>

        {/* Coins spent */}
        <View style={c.metaRow}>
          <Text style={c.metaItem}>🪙 <Text style={c.metaVal}>{coinsSpent.toLocaleString()} coins spent</Text></Text>
          <Text style={c.metaItem}>⏱ <Text style={c.metaVal}>{watchTimeRequired ?? 30}s watch time</Text></Text>
        </View>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CampaignScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { coinBalance } = useCoins();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const fetchCampaigns = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const data = await getUserCampaigns(user.email);
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload every time this tab gains focus (picks up newly-created campaigns)
  useFocusEffect(
    useCallback(() => {
      fetchCampaigns();
    }, [user])
  );

  const handleDelete = (campaignId) => {
    Alert.alert(
      "Delete Campaign",
      "Are you sure you want to delete this campaign? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCampaign(campaignId);
              fetchCampaigns(); // Refresh list after deletion
            } catch (error) {
              Alert.alert('Error', 'Failed to delete campaign');
            }
          } 
        }
      ]
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── White Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => setDrawerVisible(true)}>
          <Text style={s.hamburger}>≡</Text>
        </TouchableOpacity>
        <Text style={s.brand}>TubeRise</Text>
        <View style={s.balanceWrap}>
          <Text style={s.balance}>{coinBalance.toLocaleString()} ⚡ 0 🪙 👑</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3366FF" />
        </View>
      ) : campaigns.length === 0 ? (
        /* ── Empty state ── */
        <View style={s.emptyContainer}>
          <View style={s.emptyIconWrap}>
            <Text style={s.emptyIcon}>📥</Text>
          </View>
          <Text style={s.emptyTitle}>No Campaign Yet</Text>
          <Text style={s.emptySub}>
            Tap the + button to create a campaign and get views, likes, subscribers, and comments for your channel.
          </Text>
        </View>
      ) : (
        /* ── Campaign list ── */
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.sectionLabel}>Your Campaigns ({campaigns.length})</Text>
          {campaigns.map((camp) => (
            <CampaignCard key={camp.id} campaign={camp} onDelete={handleDelete} />
          ))}
          {/* Bottom padding for FAB */}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('CampaignCreation')}
        activeOpacity={0.85}
      >
        <Text style={s.fabTxt}>+</Text>
      </TouchableOpacity>
      
      <SidebarDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  hamburger: { fontSize: 26, color: '#121212', marginRight: 16 },
  brand: { flex: 1, fontSize: 22, fontWeight: '800', color: '#121212' },
  balanceWrap: { flexDirection: 'row', alignItems: 'center' },
  balance: { fontSize: 16, fontWeight: '700', color: '#121212' },

  /* Empty */
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, marginTop: -50,
  },
  emptyIconWrap: {
    width: 80, height: 80, backgroundColor: '#000',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#121212', marginBottom: 12 },
  emptySub: { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 22 },

  /* List */
  scroll: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },

  /* FAB */
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#3366FF',
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: '#3366FF', shadowOpacity: 0.4,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  fabTxt: { fontSize: 32, color: '#FFF', fontWeight: '300', lineHeight: 36, marginTop: -2 },
});

// ── Card Styles ───────────────────────────────────────────────────────────────
const c = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },

  /* Thumbnail zone */
  thumbWrap: { width: SW - 32, height: Math.round((SW - 32) * (9 / 16)), backgroundColor: '#000' },
  thumb: { width: '100%', height: '100%' },

  typeBadge: {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeTxt: { fontSize: 12, fontWeight: '800' },

  statusBadge: {
    position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusDone:   { backgroundColor: '#F3F4F6' },
  statusTxt: { fontSize: 12, fontWeight: '700', color: '#121212' },

  deleteBtn: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Body */
  body: { padding: 14 },

  progressHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  progressLabel: { fontSize: 13, color: '#374151' },
  progressNum: { fontWeight: '800', color: '#121212', fontSize: 14 },
  progressOf: { color: '#6B7280' },
  pctTxt: { fontSize: 13, fontWeight: '800', color: '#3366FF' },

  /* Progress bar */
  track: {
    height: 8, backgroundColor: '#E5E7EB',
    borderRadius: 4, overflow: 'hidden', marginBottom: 12,
  },
  fill: { height: 8, borderRadius: 4 },

  /* Meta row */
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { fontSize: 12, color: '#6B7280' },
  metaVal: { fontWeight: '700', color: '#D97706' },
});
