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
const BUTTONS_H = 56;
const TOGGLE_H = 48;
const TAB_BAR_H = 60;
const SAFE_AREA_TOP = 40;

const VIDEO_H = SCREEN_H * 0.45;

const thumbUrl = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
const CURRENT_USER_ID = 'user_001';



export default function SubscribeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { coinBalance } = useCoins();
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [tasks, setTasks] = useState([]);
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
  const [channelPhoto, setChannelPhoto] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!user?.email) return;
        try {
          const completedIds = await getCompletedCampaignIds(user.email);
          const campaigns = await getActiveCampaignsForFeed(user.email, completedIds);
          const all = campaigns.filter(c => c.type === 'subscribe');
          if (active) { setTasks(all); setIdx(0); }
        } catch (error) {
          console.error("Failed to load campaigns:", error);
        }
      })();
      return () => { active = false; };
    }, [user])
  );

  const task = tasks[idx % Math.max(tasks.length, 1)];
  
  // When tasks load or idx changes, fetch channel photo
  useEffect(() => {
    const currentTask = tasks[idx % Math.max(tasks.length, 1)];
    if (!currentTask?.videoId) return;
    
    setChannelPhoto(null); // reset while loading
    
    const YOUTUBE_API_KEY = 'AIzaSyDSA7JUtKvAsOJ8rWLozvI2HISw8T3lA7o';
    
    fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${currentTask.videoId}&key=${YOUTUBE_API_KEY}`)
      .then(r => r.json())
      .then(data => {
        const channelId = data.items?.[0]?.snippet?.channelId;
        if (!channelId) return;
        return fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`);
      })
      .then(r => r?.json())
      .then(chData => {
        const url = chData?.items?.[0]?.snippet?.thumbnails?.medium?.url;
        if (url) setChannelPhoto(url);
      })
      .catch(e => console.log('Channel photo error:', e));
      
  }, [tasks, idx]);

  const handleSeeAnother = () => {
    setChannelPhoto(null);
    setIdx((i) => i + 1);
  };
  const handleSubscribe = () => navigation.navigate('TaskDetail', { task, taskType: 'subscribe', autoPlay });

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#F5F5F5',
      justifyContent: 'flex-start',
      paddingTop: insets.top
    }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => setDrawerVisible(true)}>
          <Text style={s.hamburger}>≡</Text>
        </TouchableOpacity>
        <Text style={s.brand}>TubeRise</Text>
        <View style={s.balanceWrap}>
          <Text style={s.balance}>{coinBalance.toLocaleString()} ⚡ 0 🪙 👑</Text>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1, backgroundColor: '#F5F5F5' }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {tasks.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No Campaign Found</Text>
            <Text style={s.emptySubtext}>Check back later for new subscribe tasks</Text>
          </View>
        ) : (
          <View style={s.channelCard}>
            <Image source={{ uri: thumbUrl(task.videoId) }} style={s.channelBg} resizeMode="cover" blurRadius={8} />
            <View style={s.channelOverlay} />
            <View style={s.channelContent}>
              <View style={s.avatarRing}>
                {channelPhoto ? (
                  <Image source={{ uri: channelPhoto }} style={s.avatarImg} />
                ) : (
                  <View style={s.avatar}>
                    <Text style={s.avatarTxt}>{task.channelName?.charAt(0)?.toUpperCase() ?? 'C'}</Text>
                  </View>
                )}
              </View>
              <Text style={s.channelName}>{task.channelName}</Text>
              <Text style={s.channelSub}>{task.viewCount}</Text>
            </View>
          </View>
        )}

        <View style={s.infoCard}>
          <View style={s.infoIconWrap}><Text style={s.infoIcon}>i</Text></View>
          <Text style={s.infoTxt}>
            There may be drops in subscribers, TubeRise does not accept any liability.
            {'\n'}Un subscribing other channel will result in account termination.
          </Text>
        </View>

        <View style={s.btnRow}>
          <TouchableOpacity style={s.primaryBtn} onPress={handleSubscribe} activeOpacity={0.85}>
            <Text style={s.primaryBtnTxt}>Subscribe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.seeAnotherBtn} onPress={handleSeeAnother} activeOpacity={0.8}>
            <Text style={s.seeAnotherTxt}>See Another</Text>
          </TouchableOpacity>
        </View>

        <View style={s.toggleRow}>
          <Text style={s.toggleIcon}>👑</Text>
          <Text style={s.toggleLbl}>Automatically play next channel</Text>
          <Switch value={autoPlay} onValueChange={handleToggleAutoPlay}
            trackColor={{ false: '#D0D0D0', true: '#A0B9FF' }}
            thumbColor={autoPlay ? '#3366FF' : '#F5F5F5'} />
        </View>
      </ScrollView>
      <SidebarDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  hamburger: { fontSize: 26, color: '#121212', marginRight: 16 },
  brand: { flex: 1, fontSize: 22, fontWeight: '800', color: '#121212' },
  balanceWrap: { flexDirection: 'row', alignItems: 'center' },
  balance: { fontSize: 16, fontWeight: '700', color: '#121212' },
  body: { backgroundColor: '#F5F5F5' },
  channelCard: { width: SW, height: VIDEO_H, backgroundColor: '#000', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  emptyCard: { width: SW, height: VIDEO_H, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  emptySubtext: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  channelBg: { position: 'absolute', width: '100%', height: '100%' },
  channelOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)' },
  channelContent: { alignItems: 'center', zIndex: 1 },
  avatarRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3366FF', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarTxt: { fontSize: 36, fontWeight: '800', color: '#FFF' },
  channelName: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  channelSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F5F5F5', marginHorizontal: 16, marginTop: 16, gap: 12 },
  infoIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  infoIcon: { fontSize: 16, color: '#FFF', fontWeight: 'bold' },
  infoTxt: { flex: 1, fontSize: 13, color: '#121212', lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 24 },
  primaryBtn: { flex: 1, backgroundColor: '#3366FF', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  primaryBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  seeAnotherBtn: { flex: 1, backgroundColor: '#000', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  seeAnotherTxt: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16 },
  toggleIcon: { fontSize: 18, marginRight: 8 },
  toggleLbl: { flex: 1, fontSize: 14, color: '#121212' },
});
