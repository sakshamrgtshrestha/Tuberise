/**
 * LoginScreen — TubeRise Reference Design
 * Blue top section with logo + tagline | White bottom with Google sign-in button
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar,
  ActivityIndicator, ScrollView, Dimensions, ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const { width: SW } = Dimensions.get('window');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, loading, authError } = useAuth();

  // ── Admin form state (commented out — admin now uses Google Sign-In) ──
  // const [showAdminForm, setShowAdminForm] = useState(false);
  // const [username, setUsername] = useState('');
  // const [password, setPassword] = useState('');
  // const [showPass, setShowPass] = useState(false);
  // const [localError, setLocalError] = useState('');

  // GoogleSignin.configure() is now called in AuthContext on app startup.

  const handleGoogleSignIn = async () => {
    await signIn();
  };

  // ── Admin form animation (commented out — admin now uses Google Sign-In) ──
  // const slideAnim = useRef(new Animated.Value(0)).current;
  // const openAdminForm = () => { ... };
  // const closeAdminForm = () => { ... };
  // const handleAdminLogin = () => { ... };
  // const adminFormTranslate = slideAnim.interpolate({ inputRange: [0,1], outputRange: [40,0] });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Blue Top Section ── */}
        <View style={[s.topSection, { paddingTop: insets.top + 40 }]}>
          {/* Logo */}
          <View style={s.logoBox}>
            <Text style={s.logoIcon}>▶</Text>
          </View>
          <Text style={s.appName}>TubeRise</Text>
          <Text style={s.tagline}>
            Get more subscribers, likes,{'\n'}comments and views for your channel.
          </Text>
        </View>

        {/* ── White Bottom Section ── */}
        <View style={[s.bottomSection, { paddingBottom: insets.bottom + 32 }]}>

          {/* Admin Form — commented out (admin now signs in via Google) */}
          {/* {showAdminForm && (
            <Animated.View style={[s.adminForm, { opacity: slideAnim, transform: [{ translateY: adminFormTranslate }] }]}>
              ... admin form fields ...
            </Animated.View>
          )} */}

          {/* Google Sign-In Button */}
          <View style={s.googleWrap}>
            <TouchableOpacity
              style={s.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#374151" />
              ) : (
                <>
                  <View style={s.gLogo}>
                    <Text style={s.gLogoTxt}>G</Text>
                  </View>
                  <Text style={s.googleBtnTxt}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={s.signInHint}>Sign in with your google account</Text>
          </View>

          {/* Admin Link — commented out (admin now signs in via Google) */}
          {/* <TouchableOpacity style={s.adminLink} onPress={openAdminForm} activeOpacity={0.7}>
            <Text style={s.adminLinkTxt}>🛡  Admin Login</Text>
          </TouchableOpacity> */}

          <Text style={s.terms}>
            By continuing, you agree to our Terms of Service & Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.primary },

  /* Blue top */
  topSection: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  logoBox: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
  },
  logoIcon: { color: '#FFFFFF', fontSize: 36, fontWeight: '900' },
  appName: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 10 },
  tagline: {
    fontSize: 15, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 22,
  },

  /* White bottom */
  bottomSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 36,
    alignItems: 'center',
  },

  /* Google button */
  googleWrap: { width: '100%', alignItems: 'center', marginBottom: 20 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24,
    width: '100%', gap: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6,
  },
  gLogo: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center',
  },
  gLogoTxt: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  googleBtnTxt: { fontSize: 15, fontWeight: '700', color: '#374151' },
  signInHint: { fontSize: 12, color: '#9CA3AF', marginTop: 10 },

  terms: {
    fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 17,
  },
});