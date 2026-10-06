/**
 * AuthContext — Google Sign-In + session restore
 *
 * signIn()               → real Google OAuth → role auto-detected by ADMIN_EMAIL
 * adminLogin(user, pass) → hardcoded credentials → admin role (kept for fallback)
 * signOut()              → clears both, clears AsyncStorage, signs out Google
 *
 * Persistence:
 *   On mount: GoogleSignin.configure() runs FIRST, then AsyncStorage session
 *   is restored. Admin status is rechecked on every restore so a stale
 *   role stored from a previous session is always corrected.
 *   On signIn/adminLogin, saves user to AsyncStorage.
 *   On signOut, clears AsyncStorage so next app open shows LoginScreen.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createOrUpdateUser } from '../services/userService';

const ADMIN_CREDENTIALS = { username: 'admin', password: 'tuberise2024' };
const ADMIN_EMAIL = 'sakchhyam10@gmail.com';
const USER_STORAGE_KEY = '@tuberise_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [authError, setAuthError] = useState('');
  // True while we're reading AsyncStorage on first launch
  const [initializing, setInitializing] = useState(true);

  // ── On mount: configure Google Sign-In + restore saved session ─────────────
  useEffect(() => {
    // Must run before any GoogleSignin call — including signOut in the restore path
    GoogleSignin.configure({
      webClientId: '593762761539-otu4g67rjrctmj7i7cae6t0hpsjd66ib.apps.googleusercontent.com',
      offlineAccess: true,
      scopes: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl',
      ],
    });

    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Always recheck admin status so a stale role is corrected on every launch
          if (parsed.email === ADMIN_EMAIL) {
            parsed.role = 'admin';
            parsed.isAdmin = true;
            console.log('[AuthContext] Restored session — admin email detected, role corrected.');
          }
          setUser(parsed);
        }
      } catch (e) {
        console.warn('Failed to restore session:', e);
      } finally {
        setInitializing(false);
      }
    };
    restoreSession();
  }, []);

  // ── Helper: save user to AsyncStorage ──────────────────────────────────────
  const persistUser = async (userData) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    } catch (e) {
      console.warn('Failed to persist user:', e);
    }
  };

  // ── Google sign-in ─────────────────────────────────────────────────────────
  const signIn = async () => {
    setLoading(true);
    setAuthError('');
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      // v16 returns data inside response.data
      const userDetails = response.data?.user || response.user || response;
      
      console.log('Raw Google Sign-In response:', JSON.stringify(response));
      console.log('User details extracted:', JSON.stringify(userDetails));

      // ── Resolve the user's own YouTube channelId at sign-in time ───────────
      // This is cached so comment/like/subscribe verification can match by
      // authorChannelId instead of fragile display-name comparison.
      let ytChannelId = null;
      try {
        const chRes = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
          { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
        );
        const chJson = await chRes.json();
        ytChannelId = chJson?.items?.[0]?.id ?? null;
        console.log('[AuthContext] YouTube channelId resolved:', ytChannelId, '(status', chRes.status + ')');
      } catch (chErr) {
        console.warn('[AuthContext] Could not resolve YouTube channelId at sign-in:', chErr?.message);
      }

      const userData = {
        id: userDetails.id,
        email: userDetails.email,
        displayName: userDetails.name || userDetails.displayName,
        photoURL: userDetails.photo || userDetails.photoURL,
        accessToken: tokens.accessToken,
        ytChannelId,          // may be null if the API call failed
      };

      // ── Debug: log email and admin check ──────────────────────────────────
      console.log('User email:', userData.email);
      console.log('Is admin email:', userData.email === ADMIN_EMAIL);

      const dbUser = await createOrUpdateUser(userData);

      if (dbUser.isBanned) {
        Alert.alert('Account Banned', 'Your account has been banned. Please contact support.');
        setUser(null);
        setLoading(false);
        return;
      }

      // Email match takes priority; DB flag is a secondary fallback
      const isAdminUser = userData.email === ADMIN_EMAIL || dbUser.isAdmin;
      const role = isAdminUser ? 'admin' : 'user';

      console.log('Role assigned:', role);

      const fullUser = {
        ...dbUser,
        ...userData,
        role,
        isAdmin: isAdminUser,
      };

      setUser(fullUser);
      await persistUser(fullUser);
    } catch (error) {
      console.error('Google Sign-In error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      setAuthError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Admin login with hardcoded credentials.
   * Returns true on success, false on failure.
   */
  const adminLogin = async (username, password) => {
    setAuthError('');
    if (
      username.trim() === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      const adminUser = {
        id: 'admin_001',
        displayName: 'Administrator',
        email: 'admin@tuberise.app',
        role: 'admin',
        coinBalance: 0,
      };
      setUser(adminUser);
      await persistUser(adminUser);
      return true;
    }
    setAuthError('Invalid username or password.');
    return false;
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const signOut = async () => {
    // Revoke access token so the account picker always shows next login
    try { await GoogleSignin.revokeAccess(); } catch (e) {
      console.warn('revokeAccess failed (ignored):', e);
    }
    // Sign out of Google session
    try { await GoogleSignin.signOut(); } catch (e) {
      console.warn('GoogleSignin.signOut failed (ignored):', e);
    }
    // Wipe all persisted app data
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      await AsyncStorage.clear();
    } catch (e) {
      console.warn('AsyncStorage clear failed:', e);
    }
    // Clear in-memory user → AppNavigator switches to AuthStack automatically
    setUser(null);
    setAuthError('');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{ user, loading, authError, isAdmin, initializing, signIn, adminLogin, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
