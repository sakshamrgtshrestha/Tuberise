import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCoins } from '../context/CoinContext';
import { useAuth } from '../context/AuthContext';
import { createCampaign, hasActiveCampaignForVideoAndType } from '../services/campaignService';

// ── Pricing config — edit costPerUnit here to change prices ──────────────────
const PRICING_CONFIG = {
  watch:     { costPerUnit: 50,  label: 'Views',       iconName: 'play-circle-outline' },
  subscribe: { costPerUnit: 210, label: 'Subscribers', iconName: 'subscriptions'       },
  like:      { costPerUnit: 95,  label: 'Likes',       iconName: 'thumb-up'            },
  comment:   { costPerUnit: 135, label: 'Comments',    iconName: 'chat-bubble'         },
};

// ── Duration options (seconds) ────────────────────────────────────────────────
const DURATION_OPTIONS = [
  60, 90, 120, 150, 180, 210, 240, 270, 300,
  330, 360, 420, 450, 480, 510, 540, 570, 600,
];

// ── Duration multipliers ───────────────────────────────────────────────────────
const DURATION_MULTIPLIERS = {
  60:  1.0,
  90:  1.2,
  120: 1.5,
  150: 1.7,
  180: 2.0,
  210: 2.2,
  240: 2.5,
  270: 2.7,
  300: 3.0,
  330: 3.2,
  360: 3.5,
  420: 4.0,
  450: 4.2,
  480: 4.5,
  510: 4.7,
  540: 5.0,
  570: 5.2,
  600: 5.5,
};

const YOUTUBE_API_KEY = 'AIzaSyDSA7JUtKvAsOJ8rWLozvI2HISw8T3lA7o';
const RED = '#E02020';

// ── Utility: extract YouTube video ID from various URL formats ────────────────
function extractVideoId(url) {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

// ── Utility: convert ISO 8601 duration (PT1H3M45S) → total seconds ───────────
function parseISO8601Duration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || '0', 10) * 3600)
       + (parseInt(m[2] || '0', 10) * 60)
       +  parseInt(m[3] || '0', 10);
}

// ── Utility: format seconds → "H:MM:SS" or "M:SS" ────────────────────────────
function formatDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Warning Notes Box ─────────────────────────────────────────────────────────
function WarningBox() {
  return (
    <View style={s.warningBox}>
      <Text style={s.warningTitle}>⚠️  Important Notes</Text>
      <Text style={s.warningItem}>• Videos must be at least 60 seconds long</Text>
      <Text style={s.warningItem}>• Avoid private or restricted videos</Text>
      <Text style={s.warningItem}>• Comment campaigns may take 2–3 days for analytics to sync</Text>
      <Text style={s.warningItem}>• Make sure your video is publicly visible</Text>
    </View>
  );
}

// ── Duration Dropdown ─────────────────────────────────────────────────────────
function DurationDropdown({ selected, onSelect }) {
  const [open, setOpen] = React.useState(false);
  const multiplier = DURATION_MULTIPLIERS[selected] ?? 1.0;
  return (
    <View style={s.dropdownWrapper}>
      <TouchableOpacity
        style={s.dropdownTrigger}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="timer" size={18} color="#6B7280" style={{ marginRight: 8 }} />
        <Text style={s.dropdownTriggerTxt}>
          {selected}s{'  '}
          <Text style={s.dropdownMultiplierInline}>×{multiplier.toFixed(1)}</Text>
        </Text>
        <MaterialIcons
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={22}
          color="#6B7280"
        />
      </TouchableOpacity>
      {open && (
        <View style={s.dropdownList}>
          {DURATION_OPTIONS.map((opt) => {
            const mult = DURATION_MULTIPLIERS[opt] ?? 1.0;
            const isSelected = opt === selected;
            return (
              <TouchableOpacity
                key={opt}
                style={[s.dropdownItem, isSelected && s.dropdownItemActive]}
                onPress={() => { onSelect(opt); setOpen(false); }}
                activeOpacity={0.75}
              >
                <Text style={[s.dropdownItemLabel, isSelected && s.dropdownItemLabelActive]}>
                  {opt}s
                </Text>
                <Text style={[s.dropdownItemMult, isSelected && s.dropdownItemLabelActive]}>
                  ×{mult.toFixed(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CampaignCreationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { coinBalance, spendCoins } = useCoins();
  const { user } = useAuth();

  // Form state
  const [taskType,      setTaskType]      = useState('watch');
  const [videoUrl,      setVideoUrl]      = useState('');
  const [quantity,      setQuantity]      = useState('10');
  const [watchDuration, setWatchDuration] = useState(60); // number (seconds)

  // Fetch state
  const [videoMeta,      setVideoMeta]      = useState(null);
  const [fetchingMeta,   setFetchingMeta]   = useState(false);
  const [urlError,       setUrlError]       = useState('');
  const [metaError,      setMetaError]      = useState('');
  // Duplicate-campaign guard
  const [duplicateError, setDuplicateError] = useState('');
  const [checkingDup,    setCheckingDup]    = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const videoId    = extractVideoId(videoUrl.trim());
  const isValidUrl = !!videoId;
  const qty        = Math.max(0, parseInt(quantity, 10) || 0);
  const durSecs    = watchDuration; // already a number
  const config     = PRICING_CONFIG[taskType];
  const multiplier = DURATION_MULTIPLIERS[durSecs] ?? 1.0;
  const totalCost  = Math.round(config.costPerUnit * qty * multiplier);
  const canAfford  = coinBalance >= totalCost;
  const videoOk    = !!videoMeta && !metaError;
  const canSubmit  = isValidUrl && videoOk && qty > 0 && qty <= 10000
                     && canAfford && totalCost > 0
                     && !duplicateError;

  // ── Validate URL on change ─────────────────────────────────────────────────
  useEffect(() => {
    const trimmed = videoUrl.trim();
    if (trimmed === '') {
      setUrlError('');
      setVideoMeta(null);
      setMetaError('');
      return;
    }
    if (!isValidUrl) {
      setUrlError('Invalid YouTube URL — use youtube.com/watch?v=... or youtu.be/...');
      setVideoMeta(null);
      setMetaError('');
    } else {
      setUrlError('');
    }
  }, [videoUrl, isValidUrl]);

  // ── Fetch video metadata ───────────────────────────────────────────────────
  const fetchVideoMeta = useCallback(async () => {
    if (!videoId) return;
    setFetchingMeta(true);
    setMetaError('');
    setVideoMeta(null);
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
      );
      const data = await res.json();

      if (!data.items || data.items.length === 0) {
        setMetaError('Video not found or is private / unavailable.');
        return;
      }

      const item        = data.items[0];
      const durationSecs = parseISO8601Duration(item.contentDetails?.duration || 'PT0S');

      if (durationSecs < 60) {
        setMetaError('Video must be at least 60 seconds long.');
        return;
      }

      setVideoMeta({
        title:       item.snippet?.title        || 'Unknown Title',
        channelName: item.snippet?.channelTitle || 'My Channel',
        thumb:       item.snippet?.thumbnails?.high?.url
                     || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        durationSecs,
        durationStr: formatDuration(durationSecs),
      });
    } catch {
      setMetaError('Failed to fetch video info. Check your internet connection.');
    } finally {
      setFetchingMeta(false);
    }
  }, [videoId]);

  // ── Clear video meta when URL changes ─────────────────────────────────────
  useEffect(() => {
    setVideoMeta(null);
    setMetaError('');
    setDuplicateError('');
  }, [videoId]);

  // ── Duplicate-campaign check (re-runs on videoMeta OR taskType change) ──────
  useEffect(() => {
    if (!videoMeta || !videoId || !user?.email) {
      setDuplicateError('');
      return;
    }
    let cancelled = false;
    setCheckingDup(true);
    hasActiveCampaignForVideoAndType(user.email, videoId, taskType)
      .then((isDuplicate) => {
        if (cancelled) return;
        if (isDuplicate) {
          const typeLabel = PRICING_CONFIG[taskType]?.label ?? taskType;
          setDuplicateError(
            `You already have an active ${typeLabel} campaign for this video. ` +
            `Wait for it to complete or delete it before creating another ${typeLabel} campaign for the same video. ` +
            `(You can still create a different campaign type for this video.)`
          );
        } else {
          setDuplicateError('');
        }
      })
      .finally(() => { if (!cancelled) setCheckingDup(false); });
    return () => { cancelled = true; };
  }, [videoMeta, taskType]);

  // ── Submit handler — preserves all existing Firestore logic ───────────────
  const handleSubmit = async () => {
    if (!canAfford) {
      Alert.alert(
        'Not Enough Coins ⚡',
        `You need ${totalCost.toLocaleString()} coins but only have ${coinBalance.toLocaleString()}.\nEarn more coins by completing tasks!`
      );
      return;
    }

    // coinsReward: what each completing user earns (scales with duration for all types)
    const coinsRewardPerTask = Math.round(
      config.costPerUnit * multiplier * 0.5
    );

    const ok = await spendCoins(totalCost, 'Campaign creation');
    if (ok) {
      try {
        await createCampaign({
          userEmail:        user.email,
          videoUrl,
          videoId,
          type:             taskType,           // 'watch' | 'subscribe' | 'like' | 'comment'
          totalRequired:    qty,
          coinsReward:      coinsRewardPerTask,
          watchTimeRequired: durSecs,            // saved for ALL task types
          channelName:      videoMeta?.channelName || 'My Channel',
          totalCost,
        });

        Alert.alert(
          '🚀 Campaign Created!',
          `${totalCost.toLocaleString()} coins deducted. Your campaign is now live!`,
          [{ text: 'Done', onPress: () => navigation.goBack() }]
        );
      } catch {
        Alert.alert('Error', 'Failed to create campaign. Please try again.');
      }
    } else {
      Alert.alert('Insufficient Coins', 'Could not deduct coins. Please check your balance.');
    }
  };

  // ── Clear URL helper ───────────────────────────────────────────────────────
  const clearUrl = () => {
    setVideoUrl('');
    setVideoMeta(null);
    setUrlError('');
    setMetaError('');
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Campaign</Text>
        <View style={s.balanceBadge}>
          <Text style={s.balanceTxt}>⚡ {coinBalance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── 1. URL Input ────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>YouTube Video URL</Text>
        <View style={[s.urlBox, urlError ? s.inputBorderError : (isValidUrl ? s.inputBorderOk : null)]}>
          <MaterialIcons name="link" size={20} color={urlError ? RED : '#9CA3AF'} style={{ marginRight: 8 }} />
          <TextInput
            style={s.urlInput}
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor="#9CA3AF"
            value={videoUrl}
            onChangeText={setVideoUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {videoUrl.length > 0 && (
            <TouchableOpacity onPress={clearUrl} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          {isValidUrl && (
            <MaterialIcons name="check-circle" size={20} color="#10B981" style={{ marginLeft: 6 }} />
          )}
        </View>
        {urlError ? <Text style={s.errorTxt}>{urlError}</Text> : null}

        {/* Fetch Button */}
        {isValidUrl && !videoMeta && !fetchingMeta && !metaError && (
          <TouchableOpacity style={s.fetchBtn} onPress={fetchVideoMeta} activeOpacity={0.85}>
            <MaterialIcons name="video-search" size={18} color="#FFF" />
            <Text style={s.fetchBtnTxt}>Fetch Video Info</Text>
          </TouchableOpacity>
        )}

        {/* ── 2. Video Preview Card ────────────────────────────────────────── */}
        {fetchingMeta && (
          <View style={s.loadingBox}>
            <ActivityIndicator color={RED} size="small" />
            <Text style={s.loadingTxt}>Fetching video info…</Text>
          </View>
        )}

        {metaError ? (
          <View style={s.metaErrorBox}>
            <MaterialIcons name="error-outline" size={18} color={RED} />
            <Text style={s.metaErrorTxt}>{metaError}</Text>
          </View>
        ) : null}

        {videoMeta && !metaError && (
          <View style={s.previewCard}>
            <Image source={{ uri: videoMeta.thumb }} style={s.previewThumb} resizeMode="cover" />
            <View style={s.previewInfo}>
              <Text style={s.previewTitle} numberOfLines={2}>{videoMeta.title}</Text>
              <Text style={s.previewChannel}>📺 {videoMeta.channelName}</Text>
              <View style={s.previewDurRow}>
                <MaterialIcons name="schedule" size={13} color="#6B7280" />
                <Text style={s.previewDur}> {videoMeta.durationStr}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Re-fetch button when meta error */}
        {metaError && isValidUrl && (
          <TouchableOpacity style={[s.fetchBtn, { marginTop: 0 }]} onPress={fetchVideoMeta} activeOpacity={0.85}>
            <MaterialIcons name="refresh" size={18} color="#FFF" />
            <Text style={s.fetchBtnTxt}>Try Again</Text>
          </TouchableOpacity>
        )}

        {/* ── 3. Task Type Selector ────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Task Type</Text>
        <View style={s.typeRow}>
          {Object.entries(PRICING_CONFIG).map(([type, cfg]) => {
            const active = taskType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[s.typeBtn, active && s.typeBtnActive]}
                onPress={() => setTaskType(type)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={cfg.iconName}
                  size={28}
                  color={active ? '#FFFFFF' : '#000000'}
                />
                <Text style={[s.typeTxt, active && s.typeTxtActive]}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duplicate campaign error — shown below type selector */}
        {checkingDup && videoMeta ? (
          <View style={s.dupCheckingBox}>
            <ActivityIndicator size="small" color={RED} />
            <Text style={s.dupCheckingTxt}>Checking for duplicate campaigns…</Text>
          </View>
        ) : duplicateError ? (
          <View style={s.dupErrorBox}>
            <MaterialIcons name="block" size={18} color={RED} />
            <Text style={s.dupErrorTxt}>{duplicateError}</Text>
          </View>
        ) : null}

        {/* ── 4. Quantity Input ────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Number of {config.label}</Text>
        <View style={s.numRow}>
          <TextInput
            style={s.numInput}
            value={quantity}
            onChangeText={(v) => setQuantity(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={s.numUnit}>{config.label}</Text>
        </View>
        {qty > 10000 ? (
          <Text style={s.errorTxt}>Maximum 10,000 per campaign</Text>
        ) : qty === 0 && quantity !== '' ? (
          <Text style={s.errorTxt}>Quantity must be at least 1</Text>
        ) : null}

        {/* ── 5. Time Required dropdown (ALL task types) ───────────────────── */}
        <Text style={s.sectionLabel}>Time Required (Sec)</Text>
        <DurationDropdown
          selected={watchDuration}
          onSelect={setWatchDuration}
        />

        {/* ── 6. Total Cost Display ────────────────────────────────────────── */}
        <View style={s.costCard}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={s.costLabel}>Total Cost</Text>
            <Text style={s.costFormula} numberOfLines={2}>
              ⚡ {config.costPerUnit} × {qty.toLocaleString()} {config.label} × {multiplier.toFixed(1)}x ({durSecs}s)
            </Text>
          </View>
          <View style={[s.costBadge, !canAfford && totalCost > 0 && s.costBadgeWarn]}>
            <Text style={s.costBadgeTxt}>⚡ {totalCost.toLocaleString()}</Text>
          </View>
        </View>

        {!canAfford && totalCost > 0 && (
          <View style={s.insufficientBox}>
            <MaterialIcons name="warning-amber" size={16} color={RED} />
            <Text style={s.insufficientTxt}>
              You need {(totalCost - coinBalance).toLocaleString()} more coins
            </Text>
          </View>
        )}

        {/* ── 7. Warning Notes ─────────────────────────────────────────────── */}
        <WarningBox />

        {/* ── 8. Create Campaign Button ─────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.createBtn, !canSubmit && s.createBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <MaterialIcons name="rocket-launch" size={20} color="#FFF" />
          <Text style={s.createBtnTxt}>Create Campaign</Text>
        </TouchableOpacity>

        {/* Hint text when disabled */}
        {!canSubmit && (
          <Text style={s.disabledHint}>
            {(!isValidUrl && videoUrl.length > 0) ? '• Enter a valid YouTube URL\n' : ''}
            {(isValidUrl && !videoMeta && !fetchingMeta && !metaError) ? '• Tap "Fetch Video Info" to verify the video\n' : ''}
            {metaError ? `• ${metaError}\n` : ''}
            {duplicateError ? '• You already have an active campaign for this video + type\n' : ''}
            {qty === 0 ? '• Enter a quantity\n' : ''}
            {qty > 10000 ? '• Quantity exceeds maximum (10,000)\n' : ''}
            {(!canAfford && totalCost > 0) ? `• Need ${(totalCost - coinBalance).toLocaleString()} more coins` : ''}
          </Text>
        )}

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#F4F4F8' },

  /* Header */
  header: {
    backgroundColor: RED,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn:      { padding: 4, marginRight: 12 },
  headerTitle:  { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFF' },
  balanceBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  balanceTxt:   { color: '#FFF', fontWeight: '700', fontSize: 14 },

  /* Scroll */
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  /* Section label */
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 20, letterSpacing: 0.3 },

  /* URL Input */
  urlBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12,
    height: 50, borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  inputBorderError: { borderColor: RED },
  inputBorderOk:    { borderColor: '#10B981' },
  urlInput: { flex: 1, fontSize: 14, color: '#121212' },
  errorTxt: { fontSize: 12, color: RED, marginTop: 5, marginLeft: 4 },

  /* Fetch Button */
  fetchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: RED, borderRadius: 10, paddingVertical: 12,
    marginTop: 10, gap: 6,
  },
  fetchBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  /* Loading */
  loadingBox: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  loadingTxt: { fontSize: 13, color: '#6B7280' },

  /* Meta error */
  metaErrorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', marginTop: 10,
  },
  metaErrorTxt: { flex: 1, fontSize: 13, color: RED, lineHeight: 18 },

  /* Video Preview Card */
  previewCard: {
    backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB', marginTop: 12,
    shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6, elevation: 3,
  },
  previewThumb:   { width: '100%', height: 180 },
  previewInfo:    { padding: 12 },
  previewTitle:   { fontSize: 15, fontWeight: '700', color: '#121212', lineHeight: 20, marginBottom: 6 },
  previewChannel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  previewDurRow:  { flexDirection: 'row', alignItems: 'center' },
  previewDur:     { fontSize: 12, color: '#9CA3AF' },

  /* Task Type Selector */
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn: {
    flex: 1, minWidth: '44%', alignItems: 'center', paddingVertical: 14,
    backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  typeBtnActive: { backgroundColor: RED, borderColor: RED },
  typeTxt:       { fontSize: 13, fontWeight: '600', color: '#000000', marginTop: 6 },
  typeTxtActive: { color: '#FFFFFF' },

  /* Duration Dropdown */
  dropdownWrapper: { position: 'relative', zIndex: 10 },
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E5E7EB', paddingHorizontal: 14, height: 50,
  },
  dropdownTriggerTxt: { flex: 1, fontSize: 16, fontWeight: '700', color: '#121212' },
  dropdownMultiplierInline: { fontSize: 13, fontWeight: '500', color: RED },
  dropdownList: {
    position: 'absolute', top: 54, left: 0, right: 0,
    backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 8,
    maxHeight: 240, zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive:      { backgroundColor: '#FFF0F0' },
  dropdownItemLabel:       { fontSize: 15, fontWeight: '600', color: '#374151' },
  dropdownItemLabelActive: { color: RED, fontWeight: '700' },
  dropdownItemMult:        { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  /* Quantity / Duration Input */
  numRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E5E7EB', paddingHorizontal: 14, height: 50,
  },
  numInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#121212' },
  numUnit:  { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  /* Cost Card */
  costCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginTop: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4, elevation: 2,
  },
  costLabel:   { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  costFormula: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  costBadge: {
    backgroundColor: '#FFF0F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },
  costBadgeWarn: { backgroundColor: '#FFF0F0', borderColor: RED },
  costBadgeTxt:  { fontSize: 18, fontWeight: '900', color: RED },

  /* Insufficient */
  insufficientBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF0F0', borderRadius: 8, padding: 10, marginTop: 8,
  },
  insufficientTxt: { fontSize: 13, color: RED, fontWeight: '600' },

  /* Warning Box */
  warningBox: {
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A', marginTop: 20,
  },
  warningTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  warningItem:  { fontSize: 13, color: '#78350F', lineHeight: 20, marginBottom: 2 },

  /* Create Button */
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: RED, borderRadius: 14, paddingVertical: 16,
    marginTop: 24, gap: 8,
    shadowColor: RED, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8, elevation: 6,
  },
  createBtnDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0 },
  createBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  /* Disabled hint */
  disabledHint: {
    fontSize: 12, color: '#9CA3AF', textAlign: 'center',
    marginTop: 10, lineHeight: 20,
  },

  /* Duplicate campaign error */
  dupErrorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', marginTop: 10,
  },
  dupErrorTxt: { flex: 1, fontSize: 13, color: RED, lineHeight: 19 },

  dupCheckingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, marginTop: 8,
  },
  dupCheckingTxt: { fontSize: 13, color: '#6B7280' },
});
