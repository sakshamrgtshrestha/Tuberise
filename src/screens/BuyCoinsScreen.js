import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoins } from '../context/CoinContext';

const RED = '#E02020';

// ── Edit prices here anytime ──────────────────────────────────────────────────
const COIN_PACKAGES = [
  { id: '1', coins: 500,    price: '$0.99'  },
  { id: '2', coins: 1000,   price: '$1.99'  },
  { id: '3', coins: 5000,   price: '$4.99'  },
  { id: '4', coins: 10000,  price: '$9.99'  },
  { id: '5', coins: 50000,  price: '$39.99' },
  { id: '6', coins: 100000, price: '$69.99' },
];

function PackageCard({ item }) {
  const handleBuy = () => {
    Alert.alert(
      'Coming Soon! 💳',
      'Coin purchases will be available soon.\nEarn free coins by completing tasks in the app!',
      [{ text: 'OK', style: 'default' }]
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.coinAmount}>{item.coins.toLocaleString()} Coins</Text>
      <Text style={styles.bolt}>⚡</Text>
      <Text style={styles.price}>{item.price}</Text>
      <TouchableOpacity style={styles.buyBtn} onPress={handleBuy} activeOpacity={0.8}>
        <Text style={styles.buyBtnText}>Buy</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function BuyCoinsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { formattedBalance } = useCoins();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* ── Red Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Coins</Text>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceText}>⚡ {formattedBalance}</Text>
        </View>
      </View>

      {/* ── Subtitle ── */}
      <View style={styles.subtitleWrap}>
        <Text style={styles.subtitleText}>Select a coin package below</Text>
      </View>

      {/* ── 2-Column Grid ── */}
      <FlatList
        data={COIN_PACKAGES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <PackageCard item={item} />}
        ListFooterComponent={
          <Text style={styles.footer}>
            💡 Earn free coins by watching, liking, subscribing &amp; commenting on videos!
          </Text>
        }
      />
    </View>
  );
}

const CARD_PADDING = 16;
const GAP = 12;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F8',
  },

  /* Header */
  header: {
    backgroundColor: RED,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  balanceBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  balanceText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  /* Subtitle */
  subtitleWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  subtitleText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },

  /* Grid */
  grid: {
    padding: CARD_PADDING,
    paddingBottom: 32,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: GAP,
  },

  /* Package Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  coinAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#121212',
    textAlign: 'center',
    marginBottom: 10,
  },
  bolt: {
    fontSize: 44,
    marginVertical: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 4,
    marginBottom: 14,
  },
  buyBtn: {
    backgroundColor: RED,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  buyBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  /* Footer */
  footer: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
});
