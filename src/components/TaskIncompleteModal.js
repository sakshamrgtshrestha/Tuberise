/**
 * TaskIncompleteModal — v2
 *
 * Full-screen BLOCKING overlay shown when a user returns before the timer ends.
 *
 * Key changes from v1:
 *  - No "Give Up" link — modal is FULLY non-dismissible (per spec)
 *  - Only action: "Go Back to YouTube" (re-opens link)
 *  - Floating live countdown displayed prominently
 *  - Shows hard minimum required time for the task type
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Animated, BackHandler,
} from 'react-native';
import { Colors } from '../theme/colors';
import { TASK_MIN_SECONDS } from '../hooks/useEngagementLock';

const ACTION_INFO = {
  watch:     { verb: 'watching',     gh
     noun: 'the video',   icon: '▶',  color: Colors.watch },
  subscribe: { verb: 'subscribing to', noun: 'the channel', icon: '🔔', color: Colors.subscribe },
  like:      { verb: 'liking',        noun: 'the video',   icon: '👍', color: Colors.like },
  comment:   { verb: 'commenting on', noun: 'the video',   icon: '💬', color: Colors.comment },
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

export default function TaskIncompleteModal({
  visible,
  actionType,
  timerValue,      // current seconds remaining (live, from hook)
  countdownStart,  // total seconds the timer was reset to
  onReturnToYT,
}) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const info = ACTION_INFO[actionType] || ACTION_INFO.watch;
  const minReq = TASK_MIN_SECONDS[actionType] ?? 30;

  // Disable Android hardware back button while modal is showing
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible]);

  // Entrance + shake + pulse loop
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        // Shake the card
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 12, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -12, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
        ]).start();

        // Pulsing timer
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          ])
        ).start();
      });
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible]);

  const progress = countdownStart > 0 ? Math.max(0, timerValue / countdownStart) : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      // onRequestClose is intentionally empty — modal is non-dismissible
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Top color accent */}
          <View style={[styles.topAccent, { backgroundColor: info.color }]} />

          {/* Warning Icon */}
          <View style={[styles.iconCircle, { borderColor: info.color + '50', backgroundColor: info.color + '14' }]}>
            <Text style={styles.iconText}>⚠️</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>You Returned Too Early!</Text>
          <Text style={styles.subtitle}>
            You must stay on YouTube and finish{'\n'}
            {info.verb} {info.noun} to earn coins.
          </Text>

          {/* FLOATING countdown display */}
          <Animated.View style={[styles.timerBox, { transform: [{ scale: pulseAnim }], borderColor: info.color + '60' }]}>
            <Text style={styles.timerLabel}>TIME REMAINING</Text>
            <Text style={[styles.timerValue, { color: info.color }]}>{formatTime(timerValue)}</Text>
            {/* Progress track inside timer box */}
            <View style={styles.timerTrack}>
              <View style={[styles.timerBar, { width: `${(1 - progress) * 100}%`, backgroundColor: info.color }]} />
            </View>
            <Text style={styles.timerSub}>Required: {formatTime(minReq)} minimum</Text>
          </Animated.View>

          {/* Warning */}
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>ℹ️</Text>
            <Text style={styles.warningText}>
              Repeatedly leaving early may result in an account warning or ban.
            </Text>
          </View>

          {/* CTA — ONLY button, no dismiss/give-up */}
          <TouchableOpacity
            style={[styles.returnBtn, { backgroundColor: info.color }]}
            onPress={onReturnToYT}
            activeOpacity={0.85}
          >
            <Text style={styles.returnBtnIcon}>{info.icon}</Text>
            <Text style={styles.returnBtnText}>Go Back to YouTube</Text>
          </TouchableOpacity>

          <Text style={styles.lockedNote}>
            🔒 This screen cannot be dismissed until you complete the task
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  topAccent: { width: '100%', height: 5 },

  iconCircle: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    marginTop: 24, marginBottom: 16,
  },
  iconText: { fontSize: 36 },

  title: {
    fontSize: 22, fontWeight: '800', color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 8, paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: 20, paddingHorizontal: 24,
  },

  /* Floating countdown */
  timerBox: {
    width: '86%', borderRadius: 18, borderWidth: 1.5,
    backgroundColor: Colors.lightGray, padding: 18,
    alignItems: 'center', marginBottom: 18,
  },
  timerLabel: {
    fontSize: 10, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 1.5, marginBottom: 6,
  },
  timerValue: { fontSize: 44, fontWeight: '900', lineHeight: 50, marginBottom: 10 },
  timerTrack: {
    width: '100%', height: 5, backgroundColor: Colors.border,
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  timerBar: { height: 5, borderRadius: 3 },
  timerSub: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },

  /* Warning */
  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12,
    gap: 8, marginBottom: 20, marginHorizontal: 20, borderWidth: 1,
    borderColor: '#FFE082', width: '86%',
  },
  warningIcon: { fontSize: 14, marginTop: 1 },
  warningText: {
    flex: 1, fontSize: 12, color: '#8D6E20', lineHeight: 18, fontWeight: '500',
  },

  /* Buttons */
  returnBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 16, width: '86%',
    gap: 10, marginBottom: 14, elevation: 2,
  },
  returnBtnIcon: { fontSize: 18, color: Colors.white },
  returnBtnText: { color: Colors.white, fontWeight: '800', fontSize: 16 },

  lockedNote: {
    fontSize: 11, color: Colors.textMuted, marginBottom: 20,
    textAlign: 'center', paddingHorizontal: 20,
  },
});
