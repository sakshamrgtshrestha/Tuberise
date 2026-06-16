/**
 * TimerStrip
 *
 * Displays coin reward and countdown timer.
 *
 * Two modes:
 *  - Standalone (controlled=false): runs its own setInterval countdown.
 *  - Controlled (controlled=true): driven by external externalSecondsLeft +
 *    externalDone props (set by useEngagementLock when the user is in YouTube).
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../theme/colors';

export default function TimerStrip({
  coins,
  totalSeconds,
  onComplete,
  // Controlled mode props
  controlled = false,
  externalSecondsLeft,
  externalDone = false,
}) {
  // Standalone countdown state (used when controlled=false)
  const [internalSeconds, setInternalSeconds] = useState(totalSeconds);
  const [internalDone, setInternalDone] = useState(totalSeconds <= 0);
  const barAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Standalone mode: run our own timer
  useEffect(() => {
    if (controlled) return; // skip — driven externally
    if (totalSeconds <= 0) {
      setInternalDone(true);
      onCompleteRef.current && onCompleteRef.current();
      return;
    }

    Animated.timing(barAnim, {
      toValue: 0,
      duration: totalSeconds * 1000,
      useNativeDriver: false,
    }).start();

    intervalRef.current = setInterval(() => {
      setInternalSeconds(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setInternalDone(true);
          onCompleteRef.current && onCompleteRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlled]);

  // Controlled mode: sync bar animation to external seconds
  useEffect(() => {
    if (!controlled) return;
    const pct = Math.max(0, (externalSecondsLeft ?? totalSeconds) / totalSeconds);
    Animated.timing(barAnim, {
      toValue: pct,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [controlled, externalSecondsLeft, totalSeconds]);

  // Resolve which values to display
  const displaySeconds = controlled ? (externalSecondsLeft ?? totalSeconds) : internalSeconds;
  const done = controlled ? externalDone : internalDone;

  const progressWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.strip}>
      <View style={styles.row}>
        {/* Coins block */}
        <View style={styles.infoBlock}>
          <Text style={styles.dollarSign}>$</Text>
          <Text style={styles.valueGold}>{coins}</Text>
          <Text style={styles.label}> Coins</Text>
        </View>
        <View style={styles.divider} />
        {/* Timer block */}
        <View style={styles.infoBlock}>
          <Text style={styles.timerIcon}>⏱</Text>
          <Text style={[styles.value, done && styles.valueDone]}>
            {done ? 'Done!' : displaySeconds}
          </Text>
          {!done && <Text style={styles.label}> Seconds</Text>}
        </View>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  dollarSign: { fontSize: 16, fontWeight: '800', color: Colors.primary, marginRight: 3 },
  timerIcon: { fontSize: 14, marginRight: 4 },
  valueGold: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  valueDone: { color: Colors.success },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
