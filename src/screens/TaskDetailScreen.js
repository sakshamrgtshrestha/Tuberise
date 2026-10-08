import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar, Alert, ActivityIndicator, Text, TouchableOpacity, Platform, ToastAndroid } from 'react-native';
import { Colors } from '../theme/colors';
import YouTubeWebView from '../components/YouTubeWebView';
import ToastPill from '../components/ToastPill';
import { useCoins } from '../context/CoinContext';
import { updateCampaignProgress, getActiveCampaignsForFeed } from '../services/campaignService';
import { useAuth } from '../context/AuthContext';
import { markTaskCompleted, hasCompletedTimer, getCompletedCampaignIds } from '../services/completedTasksService';
import AutoplayCountdown from '../components/AutoplayCountdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// ─── DEV FLAG ─────────────────────────────────────────────────────────────────
// Set to true to test the 401 → token-refresh → retry flow.
// The FIRST API call of each verification will use "expired_token" to
// force a 401. The app must log "[Token] 401 - refreshing" then retry.
// Remove this flag (and its usages below) after confirming the flow works.
const SIMULATE_EXPIRED_TOKEN = false;
// ─────────────────────────────────────────────────────────────────────────────

// Map task type → correct tab name defined in AppNavigator.js
const TASK_TAB_MAP = {
  watch:     'View',
  like:      'Like',
  subscribe: 'Subscribe',
  comment:   'Comment',
};

// Helper: show a "session expired" alert with a Sign-In button that triggers
// navigation back to the Auth screen. Call this instead of any per-action
// "Authentication Error" alert.
const showSessionExpiredAlert = (navigation) => {
  Alert.alert(
    'Session Expired',
    'Your Google session expired. Please sign in again.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign In',
        onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] }),
      },
    ],
  );
};

export default function TaskDetailScreen({ route, navigation }) {
  const { task, taskType, autoPlay: initialAutoPlay } = route.params;
  const { addCoins } = useCoins();
  const { user } = useAuth();

  // Always fetch a fresh OAuth token before any YouTube API call.
  // Returns the access token string, or null if the Google session has expired.
  // NEVER falls back to the stale token stored in AuthContext state.
  const getFreshAccessToken = async () => {
    try {
      const tokens = await GoogleSignin.getTokens();
      const tok = tokens?.accessToken ?? null;
      console.log('[Token] getFreshAccessToken:', tok ? 'SUCCESS' : 'EMPTY');
      return tok;
    } catch (error) {
      console.warn('[Token] GoogleSignin.getTokens() threw — session likely expired:', error?.message);
      return null; // Caller must show session-expired UI
    }
  };

  // Tracks whether the first API call of the current verification has fired
  // (used by SIMULATE_EXPIRED_TOKEN to poison only the first call).
  const simulateDoneRef = useRef(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [reducedTimer, setReducedTimer] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(initialAutoPlay || false);
  const [showAutoplayOverlay, setShowAutoplayOverlay] = useState(false);
  const [appHandle, setAppHandle] = useState(null); // @handle from YouTube channels API
  const [toastMessage, setToastMessage] = useState(''); // iOS coins toast
  const toastTimerRef = useRef(null);

  // ── Show a "You have got N coins" toast ───────────────────────────────────
  // Android: native ToastAndroid. iOS: ToastPill component with auto-dismiss.
  const showCoinsToast = (coins) => {
    const msg = `You have got ${coins} coins 🎊🎉`;
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToastMessage(msg);
      toastTimerRef.current = setTimeout(() => setToastMessage(''), 2200);
    }
  };

  // Fetch the app user's YouTube @handle once so we can compare with the WebView identity.
  // Always uses getFreshAccessToken() — never the stale cached token.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await getFreshAccessToken();
        if (!token) {
          console.warn('[Identity] No token available for channel lookup');
          setAppHandle(user?.email || '');
          return;
        }
        const res = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        const ch = json?.items?.[0];
        const handle = ch?.snippet?.customUrl || null; // customUrl is the @handle (e.g. "@sak")
        const channelId = ch?.id || null;
        console.log('[Identity] App channel resolved — id:', channelId, '| customUrl (handle):', handle);
        setAppHandle(handle || user?.email || '');
      } catch (e) {
        console.warn('[Identity] channels API failed:', e?.message);
        setAppHandle(user?.email || '');
      }
    })();
  }, [user?.email]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('autoplay_enabled');
        if (stored !== null) {
          setAutoPlayEnabled(stored === 'true');
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user?.email || !task?.id) return;
    hasCompletedTimer(user.email, task.id).then(done => {
      setReducedTimer(done);
    });
  }, [task?.id, user?.email]);

  const grantRewards = async () => {
    await addCoins(task.coinsReward, `${taskType} reward`);
    showCoinsToast(task.coinsReward); // "You have got N coins 🎊🎉"
    try {
      await updateCampaignProgress(task.id);
      await markTaskCompleted(user.email, task.id, taskType);
    } catch (error) {
      console.error("Failed to update campaign progress:", error);
    }
  };

  const handleReturnToApp = async ({ success, actionVerified, webViewVideoId, timerStartedAt }) => {
    const targetTab = TASK_TAB_MAP[taskType] ?? 'View';

    // [Return] Diagnostic log — remove after confirming fix
    console.log(`[Return] handleReturnToApp called | taskType: ${taskType} | success: ${success} | actionVerified: ${actionVerified}`);

    if (!success) {
      navigation.navigate('MainTabs', { screen: targetTab });
      return;
    }
    
    // Watch type: give coins immediately
    if (taskType === 'watch') {
      await addCoins(task.coinsReward, `${taskType} reward`);
      showCoinsToast(task.coinsReward); // "You have got N coins 🎊🎉"
      await updateCampaignProgress(task.id);
      await markTaskCompleted(user.email, task.id, taskType);
      
      if (autoPlayEnabled) {
        setShowAutoplayOverlay(true);
      } else {
        navigation.navigate('MainTabs', { screen: targetTab });
      }
      return;
    }

    // ── Like: YouTube API is the PRIMARY verifier ────────────────────────────
    if (taskType === 'like') {
      // [Return] DOM detection (actionVerified) is only a hint — always verify via API
      console.log(`[Return] like branch | actionVerified: ${actionVerified}`);

      setVerifying(true);
      simulateDoneRef.current = false; // reset for this verification
      try {
        // 1. Get a fresh, non-expired access token
        let accessToken = await getFreshAccessToken();
        if (!accessToken) {
          showSessionExpiredAlert(navigation);
          return;
        }

        // 2. Extract the video ID from the task URL
        const videoUrlMatch = task.videoUrl?.match(
          /(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/,
        );
        const videoId = videoUrlMatch?.[1];

        console.log('[LikeVerify] task.videoUrl:', task.videoUrl);
        console.log('[LikeVerify] extracted task videoId:', videoId);
        console.log('[LikeVerify] webViewVideoId:', webViewVideoId);

        if (!videoId) {
          console.warn('[LikeVerify] Could not extract video ID from URL, using DOM detection');
          await grantRewards();
          navigation.navigate('MainTabs', { screen: targetTab });
          return;
        }

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const MAX_ATTEMPTS = 3;
        const RETRY_DELAY_MS = 2000;

        let likeConfirmed = false;
        let apiError = null;
        let hardAuthFailure = false;
        let lastHttpStatus = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          if (attempt > 1) {
            console.log(`[LikeVerify] Retrying (attempt ${attempt}/${MAX_ATTEMPTS}) after ${RETRY_DELAY_MS}ms...`);
            await sleep(RETRY_DELAY_MS);
            const refreshed = await getFreshAccessToken();
            if (refreshed) accessToken = refreshed;
          }

          // 3. Call YouTube API to check rating
          // SIMULATE_EXPIRED_TOKEN: poison the first call's token to force a 401
          const apiUrl = `https://www.googleapis.com/youtube/v3/videos/getRating?id=${videoId}`;
          const tokenForCall = (SIMULATE_EXPIRED_TOKEN && !simulateDoneRef.current)
            ? 'expired_token'
            : accessToken;
          if (SIMULATE_EXPIRED_TOKEN && !simulateDoneRef.current) {
            console.log('[Token] SIMULATE_EXPIRED_TOKEN: using poisoned token for first like call');
            simulateDoneRef.current = true;
          }

          let response;
          try {
            response = await fetch(apiUrl, {
              headers: { Authorization: `Bearer ${tokenForCall}` },
            });
          } catch (netErr) {
            console.warn('[LikeVerify] Network error:', netErr?.message);
            apiError = 'network';
            continue; // retry loop
          }

          lastHttpStatus = response.status;
          console.log(`[LikeVerify] attempt ${attempt} HTTP:`, lastHttpStatus);

          if (lastHttpStatus === 401) {
            console.log('[Token] 401 - refreshing');
            if (attempt < MAX_ATTEMPTS) {
              const refreshed = await getFreshAccessToken();
              if (refreshed) accessToken = refreshed;
              continue;
            } else {
              hardAuthFailure = true;
              break;
            }
          }

          if (lastHttpStatus === 403 || lastHttpStatus >= 500) {
            let errBody = '';
            try { errBody = await response.text(); } catch (_) {}
            console.warn('[LikeVerify] Non-2xx response:', lastHttpStatus, errBody.slice(0, 200));
            apiError = lastHttpStatus;
            break; // non-retryable
          }

          const json = await response.json();
          console.log('[LikeVerify] response body:', JSON.stringify(json));
          
          if (json?.error) {
            console.warn('[LikeVerify] API error body:', JSON.stringify(json.error));
            apiError = json.error?.code ?? 'api_error';
            break;
          }

          const rating = json?.items?.[0]?.rating;
          console.log('[LikeVerify] rating returned:', rating);

          if (rating === 'like') {
            likeConfirmed = true;
            break;
          }
          // If rating is 'none' or 'dislike', it will loop and retry
        }

        console.log('[LikeVerify] likeConfirmed:', likeConfirmed, '| lastHttpStatus:', lastHttpStatus, '| apiError:', apiError, '| hardAuthFailure:', hardAuthFailure);

        if (hardAuthFailure) {
          showSessionExpiredAlert(navigation);
          return;
        }

        if (apiError !== null) {
          Alert.alert(
            'Couldn\'t Verify Right Now',
            'There was a problem reaching YouTube. Please try again.',
            [{ text: 'Try Again', style: 'cancel' }],
          );
          return;
        }

        if (!likeConfirmed) {
          Alert.alert(
            'Like Not Detected',
            actionVerified
              ? `YouTube shows this action under a different account than ${user?.email}. Tap Fix in the WebView to switch accounts, then try again.`
              : 'Please like the video first before returning to app.',
            [{ text: actionVerified ? 'OK' : 'Go Back and Like', style: 'cancel' }],
          );
          return;
        }

        // 4. API confirmed — award coins
        await grantRewards();
        navigation.navigate('MainTabs', { screen: targetTab });
      } catch (e) {
        console.warn('[LikeVerify] Unexpected exception:', e?.message, e);
        Alert.alert(
          'Couldn\'t Verify Right Now',
          'There was a problem reaching YouTube. Please try again.',
          [{ text: 'Try Again', style: 'cancel' }],
        );
      } finally {
        setVerifying(false);
      }
      return;
    }
    
    // ── Subscribe: verify via YouTube Subscriptions API ─────────────────────
    if (taskType === 'subscribe') {
      // [Return] DOM detection (actionVerified) is only a hint — always verify via API
      console.log(`[Return] subscribe branch | actionVerified: ${actionVerified}`);

      setVerifying(true);
      simulateDoneRef.current = false; // reset for this verification
      try {
        // 1. Get a fresh OAuth token
        let accessToken = await getFreshAccessToken();
        if (!accessToken) {
          showSessionExpiredAlert(navigation);
          return;
        }

        // 2. Extract video ID from the task URL
        const videoUrlMatch = task.videoUrl?.match(
          /(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
        );
        const videoId = videoUrlMatch?.[1];

        if (!videoId) {
          // Can't determine video ID — fall back to DOM detection
          console.warn('Could not extract video ID from URL, using DOM detection for subscribe');
          await grantRewards();
          navigation.navigate('MainTabs', { screen: targetTab });
          return;
        }

        // 3. Get the channel ID from the video
        const YOUTUBE_API_KEY = 'AIzaSyDSA7JUtKvAsOJ8rWLozvI2HISw8T3lA7o';
        const videoRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`,
        );
        const videoJson = await videoRes.json();
        const channelId = videoJson?.items?.[0]?.snippet?.channelId;

        if (!channelId) {
          // Can't resolve channelId — trust DOM detection
          console.warn('Could not resolve channelId, trusting DOM detection for subscribe');
          await grantRewards();
          navigation.navigate('MainTabs', { screen: targetTab });
          return;
        }

        // 4. Check if the user is subscribed to that channel (with 401 retry)
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const MAX_SUB_ATTEMPTS = 3;
        const RETRY_DELAY_MS = 2000;

        let isSubscribed = false;
        let hardAuthFailure = false;
        let apiError = null;
        let lastHttpStatus = null;

        for (let attempt = 1; attempt <= MAX_SUB_ATTEMPTS; attempt++) {
          if (attempt > 1) {
            console.log(`[SubVerify] Retrying (attempt ${attempt}/${MAX_SUB_ATTEMPTS}) after ${RETRY_DELAY_MS}ms...`);
            await sleep(RETRY_DELAY_MS);
            const refreshed = await getFreshAccessToken();
            if (refreshed) accessToken = refreshed;
          }

          // SIMULATE_EXPIRED_TOKEN: poison first call
          const tokenForCall = (SIMULATE_EXPIRED_TOKEN && !simulateDoneRef.current)
            ? 'expired_token'
            : accessToken;
          if (SIMULATE_EXPIRED_TOKEN && !simulateDoneRef.current) {
            console.log('[Token] SIMULATE_EXPIRED_TOKEN: using poisoned token for first subscribe call');
            simulateDoneRef.current = true;
          }

          let subRes;
          try {
            subRes = await fetch(
              `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&forChannelId=${channelId}`,
              { headers: { Authorization: `Bearer ${tokenForCall}` } },
            );
          } catch (netErr) {
            console.warn('[SubVerify] Network error:', netErr?.message);
            apiError = 'network';
            continue;
          }

          lastHttpStatus = subRes.status;
          console.log(`[SubVerify] attempt ${attempt} HTTP:`, lastHttpStatus);

          if (lastHttpStatus === 401) {
            console.log('[Token] 401 - refreshing');
            if (attempt < MAX_SUB_ATTEMPTS) {
              const refreshed = await getFreshAccessToken();
              if (refreshed) accessToken = refreshed;
              continue;
            } else {
              hardAuthFailure = true;
              break;
            }
          }

          if (lastHttpStatus === 403 || lastHttpStatus >= 500) {
            let errBody = '';
            try { errBody = await subRes.text(); } catch (_) {}
            console.warn('[SubVerify] Non-2xx response:', lastHttpStatus, errBody.slice(0, 200));
            apiError = lastHttpStatus;
            break;
          }

          const subJson = await subRes.json();
          if (subJson?.error) {
            console.warn('[SubVerify] API error body:', JSON.stringify(subJson.error));
            apiError = subJson.error?.code ?? 'api_error';
            break;
          }
          isSubscribed = (subJson?.pageInfo?.totalResults ?? 0) > 0;
          break; // success
        }

        if (hardAuthFailure) {
          showSessionExpiredAlert(navigation);
          return;
        }

        if (apiError !== null) {
          Alert.alert(
            'Couldn\'t Verify Right Now',
            'There was a problem reaching YouTube. Please try again.',
            [{ text: 'Try Again', style: 'cancel' }],
          );
          return;
        }

        if (!isSubscribed) {
          Alert.alert(
            'Not Subscribed',
            actionVerified
              ? `YouTube shows this action under a different account than ${user?.email}. Tap Fix in the WebView to switch accounts, then try again.`
              : 'Please subscribe to the channel first before returning to the app.',
            [{ text: actionVerified ? 'OK' : 'Go Back and Subscribe', style: 'cancel' }],
          );
          return;
        }

        // 5. Subscription confirmed — award coins
        await grantRewards();
        navigation.navigate('MainTabs', { screen: targetTab });
      } catch (e) {
        console.error('[SubVerify] Unexpected exception:', e?.message, e);
        Alert.alert(
          'Couldn\'t Verify Right Now',
          'There was a problem reaching YouTube. Please try again.',
          [{ text: 'Try Again', style: 'cancel' }],
        );
      } finally {
        setVerifying(false);
      }
      return;
    }

    // ── Comment: verify via YouTube commentThreads API ───────────────────────
    if (taskType === 'comment') {
      // [Return] DOM detection (actionVerified) is only a hint — always verify via API.
      // The overlay is shown immediately so the user sees feedback during the 4×3 s retry window.
      console.log(`[Return] comment branch | actionVerified: ${actionVerified}`);

      // Record the moment the timer STARTED (from WebView) so old comments cannot be reused.
      // We apply a 60-second grace window on timerStartedAt (not the finish time) per spec Fix #5.
      const timerStartedAtMs = timerStartedAt ? new Date(timerStartedAt).getTime() : null;
      const timerFinishedAt = new Date().toISOString();

      setVerifying(true);
      simulateDoneRef.current = false; // reset for this verification
      try {
        // ── 1. Fresh access token ─────────────────────────────────────────────
        let accessToken = await getFreshAccessToken();

        // ── TEMP DIAG 1 ───────────────────────────────────────────────────────
        console.log('[CommentVerify] accessToken present:', !!accessToken);
        console.log('[CommentVerify] user.displayName:', user?.displayName);
        console.log('[CommentVerify] user.email (app login):', user?.email);
        console.log('[CommentVerify] user.ytChannelId (cached):', user?.ytChannelId);

        if (!accessToken) {
          showSessionExpiredAlert(navigation);
          return;
        }

        // ── 2. Video ID extraction ────────────────────────────────────────────
        // Handles watch?v=, youtu.be/, /shorts/, and m.youtube.com/?v=
        const videoUrlMatch = task.videoUrl?.match(
          /(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/,
        );
        const videoId = videoUrlMatch?.[1];

        // ── TEMP DIAG 2 ───────────────────────────────────────────────────────
        console.log('[CommentVerify] task.videoUrl:', task.videoUrl);
        console.log('[CommentVerify] extracted task videoId:', videoId);
        console.log('[CommentVerify] webViewVideoId:', webViewVideoId);

        if (!videoId) {
          console.warn('[CommentVerify] Could not extract video ID, trusting DOM detection for comment');
          await grantRewards();
          navigation.navigate('MainTabs', { screen: targetTab });
          return;
        }

        // ── 3. Resolve signed-in user's YouTube channelId ─────────────────────
        // Prefer the channelId cached at sign-in time (user.ytChannelId).
        // If it is missing (e.g. older session restored from AsyncStorage before
        // this feature was added), fetch it now and log it.
        let myChannelId = user?.ytChannelId ?? null;

        if (!myChannelId) {
          try {
            const chRes = await fetch(
              'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            const chJson = await chRes.json();
            myChannelId = chJson?.items?.[0]?.id ?? null;
            console.log('[CommentVerify] channels.list (live) status:', chRes.status);
          } catch (chErr) {
            console.warn('[CommentVerify] channels.list failed:', chErr?.message);
          }
        }

        // ── TEMP DIAG 3 ───────────────────────────────────────────────────────
        console.log('[CommentVerify] myChannelId resolved:', myChannelId);
        console.log('[CommentVerify] timerFinishedAt:', timerFinishedAt);

        // ── 4. Helper: sleep ─────────────────────────────────────────────────
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // ── 5. Retry loop (up to 4 attempts, 3 s apart) ──────────────────────
        // New comments can take a few seconds to appear in the API.
        const MAX_ATTEMPTS = 4;
        const RETRY_DELAY_MS = 3000;

        let commentFound = false;
        let lastHttpStatus = null;
        let apiError = null;       // set on 403 / 5xx / network error
        let hardAuthFailure = false; // set on repeated 401

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          if (attempt > 1) {
            console.log(`[CommentVerify] Retrying (attempt ${attempt}/${MAX_ATTEMPTS}) after ${RETRY_DELAY_MS}ms...`);
            await sleep(RETRY_DELAY_MS);
            // Refresh token on retry in case it expired mid-session
            try {
              const refreshed = await getFreshAccessToken();
              if (refreshed) accessToken = refreshed;
            } catch (_) { /* keep current token */ }
          }

          // Paginate up to 3 pages (order=time, maxResults=50)
          let pageToken = undefined;
          const MAX_PAGES = 3;

          for (let page = 0; page < MAX_PAGES; page++) {
            let url =
              `https://www.googleapis.com/youtube/v3/commentThreads` +
              `?part=snippet&videoId=${videoId}&order=time&maxResults=50`;
            if (pageToken) url += `&pageToken=${pageToken}`;

            // SIMULATE_EXPIRED_TOKEN: poison only the very first fetch
            const tokenForCall = (SIMULATE_EXPIRED_TOKEN && !simulateDoneRef.current)
              ? 'expired_token'
              : accessToken;
            if (SIMULATE_EXPIRED_TOKEN && !simulateDoneRef.current) {
              console.log('[Token] SIMULATE_EXPIRED_TOKEN: using poisoned token for first comment call');
              simulateDoneRef.current = true;
            }

            let commentRes;
            try {
              commentRes = await fetch(url, {
                headers: { Authorization: `Bearer ${tokenForCall}` },
              });
            } catch (netErr) {
              console.warn('[CommentVerify] Network error:', netErr?.message);
              apiError = 'network';
              break; // break page loop; outer attempt loop will retry
            }

            lastHttpStatus = commentRes.status;

            // ── TEMP DIAG 4 ────────────────────────────────────────────────
            console.log(`[CommentVerify] attempt ${attempt} page ${page + 1} HTTP:`, lastHttpStatus);

            if (lastHttpStatus === 401) {
              console.log('[Token] 401 - refreshing');
              if (attempt < MAX_ATTEMPTS) {
                const refreshed = await getFreshAccessToken();
                if (refreshed) accessToken = refreshed;
                break; // break page loop, let attempt loop retry
              } else {
                hardAuthFailure = true;
                break;
              }
            }

            if (lastHttpStatus === 403 || lastHttpStatus >= 500) {
              let errBody = '';
              try { errBody = await commentRes.text(); } catch (_) {}
              console.warn('[CommentVerify] Non-2xx response:', lastHttpStatus, errBody.slice(0, 200));
              apiError = lastHttpStatus;
              break; // non-retryable (403 quota / 5xx server) — break page loop
            }

            const commentJson = await commentRes.json();

            if (commentJson?.error) {
              console.warn('[CommentVerify] API error body:', JSON.stringify(commentJson.error));
              apiError = commentJson.error?.code ?? 'api_error';
              break;
            }

            // ── TEMP DIAG 5 ────────────────────────────────────────────────
            const items = commentJson?.items ?? [];
            console.log(`[CommentVerify] page ${page + 1}: ${items.length} items, nextPageToken:`, commentJson?.nextPageToken ?? 'none');
            if (page === 0 && attempt === 1) {
              const first5 = items.slice(0, 5).map(item => ({
                authorChannelId: item?.snippet?.topLevelComment?.snippet?.authorChannelId?.value,
                authorDisplayName: item?.snippet?.topLevelComment?.snippet?.authorDisplayName,
                publishedAt: item?.snippet?.topLevelComment?.snippet?.publishedAt,
                text: (item?.snippet?.topLevelComment?.snippet?.textOriginal ?? '').slice(0, 60),
              }));
              console.log('[CommentVerify] first 5 items (attempt 1, page 1):', JSON.stringify(first5, null, 2));
            }

            // Match: authorChannelId === myChannelId AND publishedAt >= timerFinishedAt
            for (const item of items) {
              const authorChId = item?.snippet?.topLevelComment?.snippet?.authorChannelId?.value;
              const publishedAt = item?.snippet?.topLevelComment?.snippet?.publishedAt ?? '';

              // If we don't have myChannelId, fall back to display-name match
              // and log loudly so we know to fix it.
              let matched = false;
              if (myChannelId) {
                matched = authorChId === myChannelId;
              } else {
                const authorDisplayName = item?.snippet?.topLevelComment?.snippet?.authorDisplayName ?? '';
                const userDisplayName = user?.displayName ?? '';
                matched = userDisplayName && authorDisplayName.toLowerCase() === userDisplayName.toLowerCase();
                if (matched) console.warn('[CommentVerify] Matched on display name (fallback) — channelId unavailable');
              }

              if (matched) {
                // Gate (Fix #5): comment must be newer than timerStartedAt - 60 s.
                // Using timerStartedAt (not timerFinishedAt) means a comment written any
                // time after the timer began in the WebView will pass.
                const publishedMs = publishedAt ? new Date(publishedAt).getTime() : 0;
                const baseMs = timerStartedAtMs
                  ? timerStartedAtMs - 60000
                  : new Date(timerFinishedAt).getTime() - 60000;
                if (publishedMs >= baseMs) {
                  commentFound = true;
                  console.log('[CommentVerify] Match found! authorChannelId:', authorChId, 'publishedAt:', publishedAt);
                  break;
                } else {
                  console.log('[CommentVerify] Channel matched but comment is too old:', publishedAt,
                              '< base:', new Date(baseMs).toISOString(),
                              '(timerStartedAt:', timerStartedAt, ')');
                }
              }
            }

            if (commentFound) break;

            pageToken = commentJson?.nextPageToken;
            if (!pageToken) break; // no more pages
          } // page loop

          if (commentFound || hardAuthFailure || apiError === 403) break;
          // For network / 5xx errors: retry. For 403 quota: give up (don't retry).
          if (typeof apiError === 'number' && apiError === 403) break;
        } // attempt loop

        // ── TEMP DIAG 6 ──────────────────────────────────────────────────────
        console.log('[CommentVerify] commentFound:', commentFound, '| lastHttpStatus:', lastHttpStatus, '| apiError:', apiError, '| hardAuthFailure:', hardAuthFailure);

        // ── 6. Outcome ────────────────────────────────────────────────────────
        if (hardAuthFailure) {
          showSessionExpiredAlert(navigation);
          return;
        }

        if (apiError !== null) {
          // 403 / 5xx / network — do NOT penalise user
          Alert.alert(
            'Couldn\'t Verify Right Now',
            'There was a problem reaching YouTube. Please try again.',
            [{ text: 'Try Again', style: 'cancel' }],
          );
          return;
        }

        if (!commentFound) {
          // HTTP 200 was returned but no matching comment was found — genuine miss
          Alert.alert(
            'Comment Not Found',
            actionVerified
              ? `YouTube shows this action under a different account than ${user?.email}. Tap Fix in the WebView to switch accounts, then try again.`
              : 'Please submit your comment on the video before returning to the app.',
            [{ text: actionVerified ? 'OK' : 'Go Back and Comment', style: 'cancel' }],
          );
          return;
        }

        // Comment confirmed — award coins
        await grantRewards();
        navigation.navigate('MainTabs', { screen: targetTab });
      } catch (e) {
        // Unexpected exception — do NOT penalise user
        console.warn('[CommentVerify] Unexpected exception:', e?.message, e);
        Alert.alert(
          'Couldn\'t Verify Right Now',
          'There was a problem reaching YouTube. Please try again.',
          [{ text: 'Try Again', style: 'cancel' }],
        );
      } finally {
        setVerifying(false);
      }
      return;
    }

    // Fallback for any other action type
    setVerifying(true);
    try {
      await grantRewards();
      navigation.navigate('MainTabs', { screen: targetTab });
    } catch(e) {
      Alert.alert('Error', 'Failed to award coins. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  /** Called by YouTubeWebView when auto-advance fires */
  const handleAutoAdvance = async (nextTask, nextIndex) => {
    setCurrentIndex(nextIndex);
  };

  const handleLoadNextTask = async () => {
    setShowAutoplayOverlay(false);
    try {
      const completedIds = await getCompletedCampaignIds(user.email);
      const campaigns = await getActiveCampaignsForFeed(user.email, completedIds);
      const filteredTasks = campaigns.filter(c => c.type === taskType);
      
      if (filteredTasks.length > 0) {
        // Load the next task by replacing the current screen
        navigation.replace('TaskDetail', { task: filteredTasks[0], taskType, autoPlay: autoPlayEnabled });
      } else {
        Alert.alert("No Tasks", "No more tasks available right now. Check back later!");
        setTimeout(() => {
          navigation.navigate('MainTabs', { screen: TASK_TAB_MAP[taskType] ?? 'View' });
        }, 2000);
      }
    } catch (e) {
      console.error(e);
      navigation.navigate('MainTabs', { screen: TASK_TAB_MAP[taskType] ?? 'View' });
    }
  };

  const handleStopAutoplay = async () => {
    setShowAutoplayOverlay(false);
    setAutoPlayEnabled(false);
    try {
      await AsyncStorage.setItem('autoplay_enabled', 'false');
    } catch (e) {
      console.error(e);
    }
    navigation.navigate('MainTabs', { screen: TASK_TAB_MAP[taskType] ?? 'View' });
  };

  if (!task) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <YouTubeWebView
        key={task.id}
        task={task}
        actionType={taskType}
        onReturnToApp={handleReturnToApp}
        onAutoAdvance={handleAutoAdvance}
        taskIndex={0}
        initialAutoPlay={initialAutoPlay}
        autoPlayEnabled={autoPlayEnabled}
        userEmail={user?.email}
        expectedEmail={user?.email}
        appHandle={appHandle}  // @handle fetched from YouTube channels API
        reducedTimer={reducedTimer}
      />
      {verifying && (
        <View style={styles.verifyingOverlay}>
          <View style={styles.verifyingCard}>
            <ActivityIndicator size="large" color="#3366FF" />
            <Text style={styles.verifyingTitle}>Please wait...</Text>
            <Text style={styles.verifyingSub}>Checking your action...</Text>
          </View>
        </View>
      )}

      {/* iOS coins toast — rendered last so it appears on top */}
      <ToastPill message={toastMessage} visible={!!toastMessage} />

      {showAutoplayOverlay && (
        <AutoplayCountdown
          coinsEarned={task.coinsReward}
          onCountdownEnd={handleLoadNextTask}
          onSkip={handleLoadNextTask}
          onStop={handleStopAutoplay}
          duration={20}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  verifyingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  verifyingCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  verifyingTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  verifyingSub: {
    fontSize: 14,
    color: '#666',
  }
});
