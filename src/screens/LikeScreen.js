import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Image, Dimensions, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoins } from '../context/CoinContext';
import { useAuth } from '../context/AuthContext';
import { getActiveCampaignsForFeed } from '../services/campaignService';
import { getCompletedCampaignIds } from '../services/completedTasksService';
import SidebarDrawer from '../components/SidebarDrawer';


const { width: SW } = Dimensions.get('window');
const SCREEN_H = Dimensions.get('window').height;
const HEADER_H = 60;
const INFO_CARD_H = 90;
const BUTTONS_H = 56;
const TAB_BAR_H = 60;
const SAFE_AREA_TOP = 40;

const VIDEO_H = SCREEN_H * 0.45;

const thumbUrl = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

const CURRENT_USER_ID = 'user_001';

export default function LikeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { coinBalance } = useCoins();
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!user?.email) return;
        try {
          const completedIds = await getCompletedCampaignIds(user.email);
          const campaigns = await getActiveCampaignsForFeed(user.email, completedIds);
          const all = campaigns.filter(c => c.type === 'like');
          if (active) { setTasks(all); setIdx(0); }
        } catch (error) {
          console.error("Failed to load campaigns:", error);
        }
      })();
      return () => { active = false; };
    }, [user])
  );

  const task = tasks[idx % Math.max(tasks.length, 1)];

  const handleSeeAnother = () => setIdx((i) => i + 1);
  const handleLike = () => navigation.navigate('TaskDetail', { task, taskType: 'like' });

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#F5F5F5',
      justifyContent: 'flex-start',
      paddingTop: insets.top
    }}>
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

      {/* ── Body — ScrollView ── */}
      <ScrollView 
        style={{ flex: 1, backgroundColor: '#F5F5F5' }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >

        {tasks.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No Campaign Found</Text>
            <Text style={s.emptySubtext}>Check back later for new like tasks</Text>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.92} onPress={handleLike}>
            <View style={s.videoCard}>
              <Image
                source={{ uri: thumbUrl(task.videoId) }}
                style={s.thumb}
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>
        )}

        {/* Info / Disclaimer */}
        <View style={s.infoCard}>
          <View style={s.infoIconWrap}>
            <Text style={s.infoIcon}>i</Text>
          </View>
          <Text style={s.infoTxt}>
            <Text style={{ fontWeight: '700' }}>Remember! The account you logged in this app and YT app must be same.</Text>
            {'\n'}There may be drop in likes, TubeRise does not accept any liability
          </Text>
        </View>

        {/* Buttons Row */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.primaryBtn} onPress={handleLike} activeOpacity={0.85}>
            <Text style={s.primaryBtnTxt}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.seeAnotherBtn} onPress={handleSeeAnother} activeOpacity={0.8}>
            <Text style={s.seeAnotherTxt}>See Another</Text>
          </TouchableOpacity>
        </View>



      </ScrollView>
      <SidebarDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

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

  body: { backgroundColor: '#F5F5F5' },

  videoCard: { width: SW, height: VIDEO_H, backgroundColor: '#000000', overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  emptyCard: {
    width: SW, height: VIDEO_H, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  emptySubtext: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16, marginTop: 16, gap: 12,
  },
  infoIconWrap: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  infoIcon: { fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' },
  infoTxt: { flex: 1, fontSize: 13, color: '#121212', lineHeight: 20 },

  btnRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 24 },
  primaryBtn: {
    flex: 1, backgroundColor: '#3366FF',
    borderRadius: 8, paddingVertical: 14, alignItems: 'center',
  },
  primaryBtnTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  seeAnotherBtn: {
    flex: 1, backgroundColor: '#000000',
    borderRadius: 8, paddingVertical: 14, alignItems: 'center',
  },
  seeAnotherTxt: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

});

