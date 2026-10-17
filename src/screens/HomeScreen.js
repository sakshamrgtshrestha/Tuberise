import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Switch, Image, Dimensions, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoins } from '../context/CoinContext';
import { useAuth } from '../context/AuthContext';
import { getActiveCampaignsForFeed } from '../services/campaignService';
import { getCompletedCampaignIds } from '../services/completedTasksService';
import SidebarDrawer from '../components/SidebarDrawer';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');
const SCREEN_H = Dimensions.get('window').height;
const HEADER_H = 60;
const INFO_CARD_H = 90;
const TOGGLE_H = 48;
const TAB_BAR_H = 60;
const SAFE_AREA_TOP = 40;

const VIDEO_H = SCREEN_H * 0.45;

const thumbUrl = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { coinBalance } = useCoins();
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [watchTasks, setWatchTasks] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('autoplay_enabled');
        if (stored !== null) setAutoPlay(stored === 'true');
      } catch (e) {
        console.error("Failed to load autoplay state", e);
      }
    })();
  }, []);

  const handleToggleAutoPlay = async (val) => {
    setAutoPlay(val);
    try {
      await AsyncStorage.setItem('autoplay_enabled', String(val));
    } catch (e) {
      console.error("Failed to save autoplay state", e);
    }
  };

  // Fetch active campaigns from Firestore
  useFocusEffect(
    useCallback(() => {
      const fetchTasks = async () => {
        if (!user?.email) {
          console.log('DEBUG: No user email, skipping fetch');
          return;
        }
        console.log('DEBUG: Fetching campaigns for:', user.email);
        try {
          const completedIds = await getCompletedCampaignIds(user.email);
          const campaigns = await getActiveCampaignsForFeed(user.email, completedIds);
          console.log('DEBUG: Total campaigns fetched:', campaigns.length);
          console.log('DEBUG: Campaign data:', JSON.stringify(campaigns));
          // For HomeScreen, we only show 'watch' type tasks
          const filteredWatchTasks = campaigns.filter(c => c.type === 'watch');
          console.log('DEBUG: Watch campaigns after filter:', filteredWatchTasks.length);
          setWatchTasks(filteredWatchTasks);
          setIdx(0);
        } catch (error) {
          console.error("Failed to load campaigns:", error);
        }
      };
      fetchTasks();
    }, [user])
  );

  const task = watchTasks[idx % Math.max(watchTasks.length, 1)];

  const handleSeeAnother = () => setIdx((i) => i + 1);
  const handleWatch = () => navigation.navigate('TaskDetail', { task, taskType: 'watch', autoPlay, consecutiveAutoplays: 0 });

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

        {/* Video / Empty Card */}
        {watchTasks.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No Campaign Found</Text>
            <Text style={s.emptySubtext}>Check back later for new watch tasks</Text>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.92} onPress={handleWatch}>
            <View style={s.videoCard}>
              <Image
                source={{ uri: thumbUrl(task?.videoId) }}
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
            {'\n'}There may be drop in views, TubeRise does not accept any liability
          </Text>
        </View>

        {/* Buttons Row */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.primaryBtn} onPress={handleWatch} activeOpacity={0.85} disabled={watchTasks.length === 0}>
            <Text style={s.primaryBtnTxt}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.seeAnotherBtn} onPress={handleSeeAnother} activeOpacity={0.8} disabled={watchTasks.length === 0}>
            <Text style={s.seeAnotherTxt}>See Another</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle — final element, nothing below */}
        <View style={s.toggleRow}>
          <Text style={s.toggleIcon}>👑</Text>
          <Text style={s.toggleLbl}>Automatically play next video</Text>
          <Switch
            value={autoPlay}
            onValueChange={handleToggleAutoPlay}
            trackColor={{ false: '#D0D0D0', true: '#A0B9FF' }}
            thumbColor={autoPlay ? '#3366FF' : '#F5F5F5'}
          />
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

  // Plain View — shrinks to content, background ends at tab bar
  body: { backgroundColor: '#F5F5F5' },

  videoCard: { width: SW, height: VIDEO_H, backgroundColor: '#000', overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  emptyCard: {
    width: SW, height: VIDEO_H, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emptyText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  emptySubtext: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16, marginTop: 16, gap: 12,
  },
  infoIconWrap: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  infoIcon: { fontSize: 16, color: '#FFF', fontWeight: 'bold' },
  infoTxt: { flex: 1, fontSize: 13, color: '#121212', lineHeight: 20 },

  btnRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 24 },
  primaryBtn: {
    flex: 1, backgroundColor: '#3366FF',
    borderRadius: 8, paddingVertical: 14, alignItems: 'center',
  },
  primaryBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  seeAnotherBtn: {
    flex: 1, backgroundColor: '#000',
    borderRadius: 8, paddingVertical: 14, alignItems: 'center',
  },
  seeAnotherTxt: { fontSize: 15, fontWeight: '600', color: '#FFF' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 16,
  },
  toggleIcon: { fontSize: 18, marginRight: 8 },
  toggleLbl: { flex: 1, fontSize: 14, color: '#121212' },
});
