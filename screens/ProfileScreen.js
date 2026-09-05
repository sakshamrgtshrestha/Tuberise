import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useCoins } from '../context/CoinContext';

const MENU_ITEMS = [
  { icon: '🎯', label: 'My Tasks',        sub: 'View your task history',   color: Colors.primary },
  { icon: '🚀', label: 'My Campaigns',    sub: 'Manage your campaigns',    color: Colors.subscribe },
  { icon: '💰', label: 'Withdraw Coins',  sub: 'Cash out your earnings',   color: Colors.success },
  { icon: '🔔', label: 'Notifications',   sub: 'Alerts and updates',       color: Colors.comment },
  { icon: '🛡', label: 'Account Safety',  sub: 'Warnings and status',      color: Colors.warning },
  { icon: '❓', label: 'Help & Support',  sub: 'FAQ and contact us',       color: Colors.textSecondary },
];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { coinBalance, formattedBalance, transactions } = useCoins();

  const recentTx = (transactions ?? []).slice(0, 5);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* White header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerSub}>Account</Text>
          <Text style={s.headerTitle}>My Profile</Text>
        </View>
        <TouchableOpacity style={s.signOutBtn} onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
          { text: 'Sign Out', style: 'destructive', onPress: signOut },
          { text: 'Cancel', style: 'cancel' },
        ])}>
          <Text style={s.signOutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card — dark */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{user?.displayName?.charAt(0) ?? 'U'}</Text>
            </View>
            <View style={s.onlineDot} />
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user?.displayName ?? 'User'}</Text>
            <Text style={s.profileEmail}>{user?.email ?? ''}</Text>
            <View style={s.profileBadge}>
              <Text style={s.profileBadgeTxt}>✅ Verified User</Text>
            </View>
          </View>
        </View>

        {/* Balance card */}
        <View style={s.balCard}>
          <View style={s.balLeft}>
            <Text style={s.balLabel}>Coin Balance</Text>
            <Text style={s.balValue}>{formattedBalance}</Text>
            <Text style={s.balSub}>🪙 available to spend</Text>
          </View>
          <TouchableOpacity style={s.withdrawBtn}>
            <Text style={s.withdrawBtnTxt}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: 'Tasks Done', value: '47', color: Colors.primary },
            { label: 'Campaigns', value: '2', color: Colors.subscribe },
            { label: 'Warnings', value: user?.warningCount ?? 0, color: Colors.warning },
          ].map((st, i) => (
            <View key={i} style={[s.statCard, { borderTopColor: st.color }]}>
              <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent transactions */}
        {recentTx.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Recent Activity</Text>
            <View style={s.txCard}>
              {recentTx.map((tx, i) => (
                <View key={tx.id} style={[s.txRow, i < recentTx.length - 1 && s.txBorder]}>
                  <View style={[s.txIcon, { backgroundColor: tx.amount > 0 ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={s.txIconTxt}>{tx.amount > 0 ? '🪙' : '💸'}</Text>
                  </View>
                  <View style={s.txMeta}>
                    <Text style={s.txReason}>{tx.reason || 'Transaction'}</Text>
                    <Text style={s.txTime}>{new Date(tx.timestamp).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[s.txAmt, { color: tx.amount > 0 ? Colors.success : Colors.admin }]}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} 🪙
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Menu items */}
        <Text style={s.sectionLabel}>Settings</Text>
        <View style={s.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.menuRow, i < MENU_ITEMS.length - 1 && s.menuBorder]}
              activeOpacity={0.7}
            >
              <View style={[s.menuIcon, { backgroundColor: item.color + '18' }]}>
                <Text style={s.menuIconTxt}>{item.icon}</Text>
              </View>
              <View style={s.menuText}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <Text style={[s.menuArrow, { color: item.color }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.version}>TubeRise v2.0 • Build 2024.05</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:Colors.background },
  header: { flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:16, borderBottomWidth:1, borderBottomColor:Colors.border },
  headerSub: { fontSize:12, color:Colors.textSecondary, fontWeight:'500' },
  headerTitle: { fontSize:24, fontWeight:'800', color:Colors.textPrimary },
  signOutBtn: { backgroundColor:Colors.lightGray, borderRadius:12, paddingHorizontal:14, paddingVertical:8, borderWidth:1, borderColor:Colors.border },
  signOutTxt: { fontSize:13, color:Colors.textSecondary, fontWeight:'600' },
  scroll: { paddingHorizontal:16, paddingTop:16, paddingBottom:32 },

  /* Profile card — dark bg */
  profileCard: { backgroundColor:Colors.cardBg, borderRadius:18, padding:20, flexDirection:'row', alignItems:'center', gap:16, marginBottom:14 },
  avatarWrap: { position:'relative' },
  avatar: { width:64, height:64, borderRadius:32, backgroundColor:Colors.primary, alignItems:'center', justifyContent:'center' },
  avatarTxt: { color:Colors.white, fontWeight:'900', fontSize:26 },
  onlineDot: { position:'absolute', bottom:2, right:2, width:14, height:14, borderRadius:7, backgroundColor:Colors.success, borderWidth:2, borderColor:Colors.cardBg },
  profileInfo: { flex:1 },
  profileName: { fontSize:18, fontWeight:'800', color:Colors.white },
  profileEmail: { fontSize:12, color:Colors.textOnDarkSecondary, marginTop:3 },
  profileBadge: { backgroundColor:'rgba(16,185,129,0.18)', borderRadius:8, paddingHorizontal:8, paddingVertical:3, alignSelf:'flex-start', marginTop:8 },
  profileBadgeTxt: { fontSize:11, fontWeight:'700', color:Colors.success },

  /* Balance card */
  balCard: { backgroundColor:Colors.primaryLight, borderRadius:16, padding:18, flexDirection:'row', alignItems:'center', marginBottom:14, borderWidth:1, borderColor:Colors.primary+'30' },
  balLeft: { flex:1 },
  balLabel: { fontSize:12, color:Colors.primary, fontWeight:'600' },
  balValue: { fontSize:30, fontWeight:'900', color:Colors.primary, marginTop:2 },
  balSub: { fontSize:11, color:Colors.primary+'90', marginTop:3 },
  withdrawBtn: { backgroundColor:Colors.primary, borderRadius:12, paddingHorizontal:16, paddingVertical:12 },
  withdrawBtnTxt: { color:Colors.white, fontWeight:'700', fontSize:13 },

  /* Stats */
  statsRow: { flexDirection:'row', gap:10, marginBottom:18 },
  statCard: { flex:1, backgroundColor:Colors.white, borderRadius:14, padding:12, alignItems:'center', borderTopWidth:3, borderWidth:1, borderColor:Colors.border, elevation:2, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:5 },
  statVal: { fontSize:18, fontWeight:'800' },
  statLbl: { fontSize:10, color:Colors.textSecondary, marginTop:3, textAlign:'center' },

  /* Section label */
  sectionLabel: { fontSize:13, fontWeight:'700', color:Colors.textSecondary, marginBottom:10 },

  /* Transactions */
  txCard: { backgroundColor:Colors.white, borderRadius:14, overflow:'hidden', borderWidth:1, borderColor:Colors.border, elevation:1, marginBottom:18 },
  txRow: { flexDirection:'row', alignItems:'center', padding:14, gap:12 },
  txBorder: { borderBottomWidth:1, borderBottomColor:Colors.divider },
  txIcon: { width:38, height:38, borderRadius:11, alignItems:'center', justifyContent:'center' },
  txIconTxt: { fontSize:18 },
  txMeta: { flex:1 },
  txReason: { fontSize:13, fontWeight:'600', color:Colors.textPrimary },
  txTime: { fontSize:11, color:Colors.textSecondary, marginTop:2 },
  txAmt: { fontSize:14, fontWeight:'800' },

  /* Menu */
  menuCard: { backgroundColor:Colors.white, borderRadius:16, overflow:'hidden', borderWidth:1, borderColor:Colors.border, elevation:1, marginBottom:20 },
  menuRow: { flexDirection:'row', alignItems:'center', padding:16, gap:14 },
  menuBorder: { borderBottomWidth:1, borderBottomColor:Colors.divider },
  menuIcon: { width:40, height:40, borderRadius:11, alignItems:'center', justifyContent:'center' },
  menuIconTxt: { fontSize:20 },
  menuText: { flex:1 },
  menuLabel: { fontSize:14, fontWeight:'600', color:Colors.textPrimary },
  menuSub: { fontSize:11, color:Colors.textSecondary, marginTop:2 },
  menuArrow: { fontSize:22, fontWeight:'700' },

  version: { fontSize:11, color:Colors.textMuted, textAlign:'center', marginTop:4 },
});
