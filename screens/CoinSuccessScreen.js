import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { FontSize } from '../theme/typography';
import { useCoins } from '../context/CoinContext';

const typeLabel = {
  watch: 'Watch Task',
  subscribe: 'Subscribe Task',
  like: 'Like Task',
  comment: 'Comment Task',
};

const typeIcon = { watch: '▶', subscribe: '🔔', like: '👍', comment: '💬' };
const typeColor = {
  watch:     Colors.watch,
  subscribe: Colors.subscribe,
  like:      Colors.like,
  comment:   Colors.comment,
};

export default function CoinSuccessScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { coinsEarned, taskType } = route.params;
  const { formattedBalance } = useCoins();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const color = typeColor[taskType] || Colors.primary;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* White header */}
      <View style={styles.header}>
        <View style={styles.headerLogoRow}>
          <Text style={styles.headerLogoPlay}>▶</Text>
          <Text style={styles.headerLogoText}>TubeRise</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          {/* Success Icon */}
          <View style={[styles.iconCircle, { backgroundColor: color + '18', borderColor: color + '40' }]}>
            <Text style={styles.checkIcon}>✅</Text>
          </View>

          <Text style={styles.successTitle}>Task Complete!</Text>
          <Text style={styles.taskLabel}>{typeIcon[taskType]} {typeLabel[taskType]}</Text>

          {/* Coins Earned */}
          <View style={[styles.coinEarnedBox, { backgroundColor: color + '12', borderColor: color + '25' }]}>
            <Text style={styles.coinEarnedPlus}>+</Text>
            <Text style={[styles.coinEarnedNum, { color }]}>{coinsEarned}</Text>
            <Text style={styles.coinEarnedEmoji}>🪙</Text>
          </View>
          <Text style={styles.coinEarnedLabel}>coins added to your balance</Text>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>New Balance:</Text>
            <Text style={styles.balanceValue}>{formattedBalance} 🪙</Text>
          </View>
        </Animated.View>

        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: color }]}
            onPress={() => navigation.navigate('MainTabs')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.navigate('TaskDetail', { taskType })}
            activeOpacity={0.85}
          >
            <Text style={styles.btnSecondaryText}>Do Another Task</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  /* White header */
  header: {
    paddingHorizontal: 16, paddingVertical: 16, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerLogoPlay: { color: Colors.primary, fontSize: 16, fontWeight: '900' },
  headerLogoText: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  card: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 32, width: '100%',
    alignItems: 'center', elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16,
  },
  iconCircle: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  checkIcon: { fontSize: 44 },
  successTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  taskLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 22 },

  coinEarnedBox: {
    flexDirection: 'row', alignItems: 'baseline', borderRadius: 16,
    paddingHorizontal: 28, paddingVertical: 16, borderWidth: 1,
    marginBottom: 8,
  },
  coinEarnedPlus: { fontSize: 28, fontWeight: '800', color: Colors.success, marginRight: 4 },
  coinEarnedNum: { fontSize: 56, fontWeight: '900', lineHeight: 66 },
  coinEarnedEmoji: { fontSize: 36, marginLeft: 6 },
  coinEarnedLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 22 },

  balanceRow: {
    flexDirection: 'row', gap: 8, backgroundColor: '#FFF8E1', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: '#FFE082',
  },
  balanceLabel: { fontSize: 13, color: '#8D6E20', fontWeight: '500' },
  balanceValue: { fontSize: 13, fontWeight: '800', color: '#8D6E20' },

  btnGroup: { width: '100%', gap: 12, marginTop: 28 },
  btnPrimary: {
    borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', elevation: 2,
  },
  btnPrimaryText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
  },
  btnSecondaryText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
});
