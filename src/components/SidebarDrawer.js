import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Animated, TouchableWithoutFeedback, ToastAndroid, Platform, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme/colors';
import { mockCoinsPerTask } from '../data/mockData';

const { width } = Dimensions.get('window');

export default function SidebarDrawer({ visible, onClose }) {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  
  const slideAnim = useRef(new Animated.Value(-width * 0.85)).current;

  const handleBuyCoins = () => {
    onClose();
    navigation.navigate('BuyCoins');
  };

  const handleHowToUse = () => {
    onClose();
    navigation.navigate("HowToUse");
  };

  const handleEarnCoins = () => {
    Alert.alert(
      "How to Earn Coins 🪙",
      `\n👁 Watch videos: +${mockCoinsPerTask.watch} coins\n👍 Like videos: +${mockCoinsPerTask.like} coins\n🔔 Subscribe: +${mockCoinsPerTask.subscribe} coins\n💬 Comment: +${mockCoinsPerTask.comment} coins\n\nStart watching now to earn!`,
      [{ text: "Start Watching", onPress: () => onClose() }]
    );
  };

  const handleFeedback = () => {
    const email = 'sakchhyam10@gmail.com';
    const subject = 'TubeRise App Feedback';
    const body = 'Hi TubeRise Team,\n\n[Your feedback here]\n\nApp version: 1.0.0';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", `Please email us at: ${email}`);
      }
    }).catch(() => {
      Alert.alert("Error", `Please email us at: ${email}`);
    });
  };

  const handlePrivacyPolicy = () => {
    onClose();
    navigation.navigate("PrivacyPolicy");
  };

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width * 0.85,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>
        
        <Animated.View style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={s.profileSection}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'S'}</Text>
            </View>
            <Text style={s.userName}>{user?.name || 'sakchhyam shrestha'}</Text>
            <Text style={s.userEmail}>{user?.email || 'sakchhyam10@gmail.com'}</Text>
          </View>
          
          <View style={s.divider} />

          <View style={s.banner}>
            <View style={s.bannerTextWrap}>
              <Text style={s.bannerTitle}>Unlock All Features</Text>
              <Text style={s.bannerSub}>10% Discount on Every Campaign</Text>
            </View>
            <TouchableOpacity style={s.goBtn}>
              <Text style={s.goBtnTxt}>GO</Text>
            </TouchableOpacity>
          </View>
          
          <View style={s.menuList}>
            <MenuItem icon="🛒" label="Buy Coins" onPress={handleBuyCoins} />
            {/* 
            <MenuItem icon="✅" label="VIP Access" />
            <MenuItem icon="💻" label="Premium Promotion (Guaranteed)" labelColor="#3366FF" />
            <View style={s.divider} /> 
            */}
            <MenuItem icon="❓" label="How to Use App Guide" onPress={handleHowToUse} />
            <View style={s.divider} />
            <MenuItem icon="🏹" label="Earn Coins" onPress={handleEarnCoins} />
            {/* 
            <MenuItem icon="🏷️" label="Invitation Bonus" />
            <MenuItem icon="🔗" label="Invite Friends" />
            <MenuItem icon="💬" label="FAQs" /> 
            */}
            <MenuItem icon="⭐" label="Rate the App" />
            <MenuItem icon="➤" label="Send a Feedback" onPress={handleFeedback} />
            <View style={s.divider} />
            <MenuItem 
              icon="🚪" 
              label="Sign Out" 
              labelColor="red" 
              onPress={() => { 
                Alert.alert('Sign Out', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: () => { onClose(); signOut(); } },
                ]);
              }} 
            />
            <View style={s.divider} />
            <MenuItem icon="🔒" label="Privacy Policy" onPress={handlePrivacyPolicy} />
            {/* <MenuItem icon="🚪" label="Logout" onPress={() => { onClose(); signOut(); }} /> */}
          </View>
          
          <View style={s.bottom}>
            <Text style={s.version}>1.0.0</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MenuItem({ icon, label, labelColor = '#121212', onPress }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress}>
      <Text style={s.menuIcon}>{icon}</Text>
      <Text style={[s.menuLabel, { color: labelColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawer: { 
    width: '85%', 
    height: '100%', 
    backgroundColor: '#FFFFFF', 
    paddingTop: 50,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  profileSection: { paddingHorizontal: 20, alignItems: 'flex-start', marginBottom: 16 },
  avatar: { width: 70, height: 70, borderRadius: 16, backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: '700' },
  userName: { fontSize: 16, fontWeight: '600', color: '#121212', marginBottom: 2 },
  userEmail: { fontSize: 13, color: '#6B7280' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8, marginHorizontal: 20 },
  banner: { 
    backgroundColor: '#F59E0B', 
    marginHorizontal: 20, 
    borderRadius: 8, 
    padding: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 10
  },
  bannerTextWrap: { flex: 1 },
  bannerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  bannerSub: { color: '#FFF', fontSize: 10 },
  goBtn: { backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  goBtnTxt: { color: '#F59E0B', fontWeight: 'bold', fontSize: 12 },
  menuList: { flex: 1, paddingHorizontal: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuIcon: { fontSize: 18, marginRight: 16, width: 24, textAlign: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '500' },
  bottom: { padding: 20 },
  version: { fontSize: 12, color: '#6B7280' }
});
