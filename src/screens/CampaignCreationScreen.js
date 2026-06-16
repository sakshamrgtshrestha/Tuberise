import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  TextInput, ScrollView, Alert, Dimensions, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useCoins } from '../context/CoinContext';
import { useAuth } from '../context/AuthContext';
import { createCampaign } from '../services/campaignService';

const { width: SW } = Dimensions.get('window');
const thumbUrl = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

export default function CampaignCreationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { coinBalance, spendCoins } = useCoins();
  const { user } = useAuth();

  const [actionType, setActionType] = useState('view');
  const [videoUrl, setVideoUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [fetchingChannel, setFetchingChannel] = useState(false);
  const [quantity, setQuantity] = useState('10');
  const [timeReq, setTimeReq] = useState('60');

  const extractId = (url) => {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return m ? m[1] : null;
  };
  const extractedId = extractId(videoUrl);
  const isValidUrl = !!extractedId;

  const YOUTUBE_API_KEY = 'AIzaSyDSA7JUtKvAsOJ8rWLozvI2HISw8T3lA7o';

  useEffect(() => {
    if (!extractedId) { setChannelName(''); return; }
    setFetchingChannel(true);
    fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${extractedId}&key=${YOUTUBE_API_KEY}`)
      .then(r => r.json())
      .then(data => {
        const title = data.items?.[0]?.snippet?.channelTitle || 'My Channel';
        setChannelName(title);
      })
      .catch(() => setChannelName('My Channel'))
      .finally(() => setFetchingChannel(false));
  }, [extractedId]);

  const qty = parseInt(quantity, 10) || 0;
  const time = parseInt(timeReq, 10) || 0;
  
  const totalCost = Math.round(qty * time * 0.42);
  const canAfford = coinBalance >= totalCost;
  const canSubmit = isValidUrl && qty > 0 && time > 0 && canAfford;

  const handleSubmit = async () => {
    if (!videoUrl.trim() || !isValidUrl) { Alert.alert('Invalid Link', 'Please enter a valid YouTube link'); return; }
    if (qty <= 0) { Alert.alert('Invalid', 'Enter a valid quantity.'); return; }
    if (!canAfford) {
      Alert.alert('Insufficient Coins', `You need ${(totalCost - coinBalance).toLocaleString()} more coins.`);
      return;
    }
    
    // Deduct coins first
    const ok = await spendCoins(totalCost, 'Campaign creation');
    if (ok) {
      const taskTypeMap = { view: 'watch', subscribe: 'subscribe', like: 'like', comment: 'comment' };
      const taskType = taskTypeMap[actionType];

      try {
        await createCampaign({
          userEmail: user.email,
          videoUrl,
          videoId: extractedId,
          type: taskType,
          totalRequired: qty,
          coinsReward: Math.round(time * 0.42),
          watchTimeRequired: time,
          channelName: channelName || 'My Channel',
          totalCost,
        });

        Alert.alert(
          '🚀 Campaign Created!',
          `${totalCost.toLocaleString()} coins deducted. Your campaign is now live!`,
          [{ text: 'Done', onPress: () => navigation.goBack() }]
        );
      } catch (error) {
        // If campaign creation fails, we might want to refund coins here,
        // but for now just show alert
        Alert.alert('Error', 'Failed to create campaign. Please try again.');
      }
    } else {
      Alert.alert('Insufficient Coins', 'Could not deduct coins. Please check your balance.');
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={28} color="#666" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Campaign</Text>
        <Text style={s.balance}>{coinBalance.toLocaleString()} ❤️</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Black Info Banner */}
        {!isValidUrl && (
          <View style={s.blackBanner}>
            <Text style={s.bannerTxt}>• Do not create multiple campaigns for the same video.</Text>
            <Text style={s.bannerTxt}>• It may take up to 72 hours for campaigns to be reflected on YT.</Text>
            <Text style={s.bannerTxt}>• Campaigns violating the policy will be deleted.</Text>
            <Text style={s.bannerTxt}>• Use the YT Studio app for detailed analysis.</Text>
            <Text style={s.bannerTxt}>• The completion time of campaigns may vary.</Text>
          </View>
        )}

        {/* Video Preview */}
        {isValidUrl ? (
          <Image source={{ uri: thumbUrl(extractedId) }} style={s.previewThumb} resizeMode="cover" />
        ) : (
          <View style={s.emptyPreview} />
        )}

        <View style={s.contentPad}>
          {/* Info Card */}
          <View style={s.infoCard}>
            <View style={s.infoIconWrap}>
              <Text style={s.infoIcon}>?</Text>
            </View>
            <Text style={s.infoCardTxt}>To get the video link: Open your video on YT → Share → Copy Link</Text>
          </View>

          {/* URL Input */}
          <View style={s.urlRow}>
            <TextInput
              style={s.urlInput}
              placeholder="Video Link Address"
              placeholderTextColor="#9CA3AF"
              value={videoUrl}
              onChangeText={setVideoUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={s.urlActions}>
              <MaterialIcons name="history" size={24} color="#9CA3AF" />
              <MaterialIcons name="play-arrow" size={24} color="#FF0000" style={{ marginLeft: 8 }} />
              <TouchableOpacity onPress={() => {}}><Text style={s.addTxt}>Add</Text></TouchableOpacity>
            </View>
          </View>
          {isValidUrl && channelName ? (
            <Text style={s.channelNameTxt}>
              📺 Channel: {fetchingChannel ? 'Loading...' : channelName}
            </Text>
          ) : null}

          {/* Tabs */}
          <View style={s.tabsRow}>
            {['view', 'subscribe', 'like', 'comment'].map((type) => {
              const isActive = actionType === type;
              const icons = { view: 'play-arrow', subscribe: 'layers', like: 'thumb-up', comment: 'chat-bubble' };
              return (
                <TouchableOpacity
                  key={type}
                  style={[s.tabBtn, isActive && s.tabBtnActive]}
                  onPress={() => setActionType(type)}
                >
                  <MaterialIcons name={icons[type]} size={20} color={isActive ? '#FFFFFF' : '#9CA3AF'} />
                  <Text style={[s.tabBtnTxt, isActive && s.tabBtnTxtActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Settings Section */}
          <View style={s.sectionHeader}>
            <View style={s.line} />
            <Text style={s.sectionHeaderTxt}>Campaign Settings</Text>
            <View style={s.line} />
          </View>

          <View style={s.dropdownRow}>
            <Text style={s.dropdownLabel}>Number of {actionType === 'view' ? 'Views' : actionType === 'subscribe' ? 'Subscribers' : actionType === 'like' ? 'Likes' : 'Comments'}</Text>
            <View style={s.dropdownBox}>
              <TextInput style={s.dropdownInput} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#9CA3AF" />
            </View>
          </View>

          <View style={s.dropdownRow}>
            <Text style={s.dropdownLabel}>Required Time (sec.)</Text>
            <View style={s.dropdownBox}>
              <TextInput style={s.dropdownInput} value={timeReq} onChangeText={setTimeReq} keyboardType="numeric" />
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#9CA3AF" />
            </View>
          </View>

          {/* Cost Section */}
          <View style={s.sectionHeader}>
            <View style={s.line} />
            <Text style={s.sectionHeaderTxt}>Campaign Cost</Text>
            <View style={s.line} />
          </View>

          <View style={s.costRow}>
            <Text style={s.costLabel}>Total Cost</Text>
            <Text style={s.costNum}>{totalCost} ❤️</Text>
          </View>

          <TouchableOpacity style={[s.createBtn, !canSubmit && { opacity: 0.5 }]} onPress={handleSubmit} disabled={!canSubmit}>
            <Text style={s.createBtnTxt}>Create</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, color: '#666' },
  balance: { fontSize: 16, fontWeight: '700', color: '#121212' },
  scroll: { flex: 1 },
  
  blackBanner: { backgroundColor: '#000', padding: 16 },
  bannerTxt: { color: '#999', fontSize: 12, marginBottom: 4, lineHeight: 18 },
  
  previewThumb: { width: SW, height: Math.round(SW * (9 / 16)), backgroundColor: '#E5E7EB' },
  emptyPreview: { width: SW, height: 0 },
  
  contentPad: { paddingHorizontal: 16, paddingTop: 16 },
  
  infoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F3F4F6',
    marginBottom: 20
  },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#9CA3AF',
    alignItems: 'center', justifyContent: 'center', marginRight: 12
  },
  infoIcon: { color: '#9CA3AF', fontWeight: 'bold', fontSize: 16 },
  infoCardTxt: { flex: 1, fontSize: 13, color: '#6B7280' },
  
  urlRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 24, paddingLeft: 16,
    paddingRight: 8, height: 48, marginBottom: 20
  },
  channelNameTxt: { 
    fontSize: 13, color: '#374151', marginBottom: 16,
    paddingHorizontal: 4 
  },
  urlInput: { flex: 1, fontSize: 14, color: '#121212' },
  urlActions: { flexDirection: 'row', alignItems: 'center' },
  addTxt: { color: '#3366FF', fontWeight: 'bold', marginLeft: 12, fontSize: 14 },
  
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  tabBtn: { width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  tabBtnActive: { backgroundColor: '#3366FF', borderColor: '#3366FF' },
  tabBtnTxt: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', marginLeft: 6 },
  tabBtnTxtActive: { color: '#FFFFFF' },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  sectionHeaderTxt: { fontSize: 14, fontWeight: '600', color: '#374151', marginHorizontal: 16 },
  
  dropdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dropdownLabel: { fontSize: 14, color: '#6B7280' },
  dropdownBox: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', 
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 12, 
    height: 40, width: 100, justifyContent: 'space-between' 
  },
  dropdownInput: { flex: 1, fontSize: 14, color: '#121212', textAlign: 'center' },
  
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  costLabel: { fontSize: 14, color: '#6B7280' },
  costNum: { fontSize: 18, fontWeight: 'bold', color: '#121212' },
  
  createBtn: { backgroundColor: '#3366FF', borderRadius: 30, paddingVertical: 16, alignItems: 'center' },
  createBtnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});
