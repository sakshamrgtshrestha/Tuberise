import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import ToastPill from './ToastPill';

const { width: SW } = Dimensions.get('window');
const fmt = (s) => {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
};

const TASK_MIN_SECONDS = { watch: 0, subscribe: 30, like: 20, comment: 45 };

// Injected JS — disables all page scrolling and touch interaction inside WebView
const LOCK_SCRIPT = `
  (function() {
    if (window.__tuberiseLockApplied) return true;
    window.__tuberiseLockApplied = true;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    var absorb = function(e) { e.stopPropagation(); e.preventDefault(); };
    window.__tuberiseAbsorb = absorb;
    var events = ['touchstart','touchmove','touchend','pointerdown','pointermove','pointerup','mousedown','click'];
    events.forEach(function(ev) {
      document.addEventListener(ev, absorb, { passive: false, capture: true });
    });
    window.__tuberiseEvents = events;
  })();
  true;
`;

const UNLOCK_SCRIPT = `
  (function() {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    if (window.__tuberiseAbsorb && window.__tuberiseEvents) {
      window.__tuberiseEvents.forEach(function(ev) {
        document.removeEventListener(ev, window.__tuberiseAbsorb, { capture: true });
      });
    }
    window.__tuberiseLockApplied = false;
  })();
  true;
`;

const LOGIN_CHECK_SCRIPT = `
  (function checkLogin() {
    setTimeout(function() {
      var avatar = document.querySelector('#avatar-btn') || 
                   document.querySelector('button.ytd-topbar-menu-button-renderer') ||
                   document.querySelector('[aria-label="Account menu"]');
      var signInBtn = document.querySelector('[aria-label="Sign in"]') ||
                      document.querySelector('a[href*="accounts.google.com"]');
      if (avatar && !signInBtn) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          type: 'LOGIN_STATUS', loggedIn: true 
        }));
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          type: 'LOGIN_STATUS', loggedIn: false 
        }));
      }
    }, 3000);
  })();
  true;
`;

const LIKE_DETECTION_SCRIPT = `
  (function() {
    var checkInterval = setInterval(function() {
      var likeBtn = document.querySelector('button[aria-label*="like this video"]') ||
                    document.querySelector('.YtLikeButtonViewModelHost button') ||
                    document.querySelector('button.yt-spec-button-shape-next[aria-pressed="true"]');
      if (likeBtn) {
        likeBtn.addEventListener('click', function() {
          setTimeout(function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ACTION_COMPLETED', action: 'LIKE'
            }));
          }, 1000);
        });
        clearInterval(checkInterval);
      }
    }, 1000);
    setTimeout(function() {
      var likedBtn = document.querySelector('button[aria-label*="like this video"][aria-pressed="true"]') ||
                     document.querySelector('.YtLikeButtonViewModelHost button[aria-pressed="true"]');
      if (likedBtn) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ACTION_COMPLETED', action: 'LIKE'
        }));
      }
    }, 2000);
  })();
  true;
`;

const SUBSCRIBE_DETECTION_SCRIPT = `
  (function() {
    var checkInterval = setInterval(function() {
      var subBtn = document.querySelector('button[aria-label*="Subscribe"]') ||
                   document.querySelector('yt-button-shape button') ||
                   document.querySelector('#subscribe-button button');
      if (subBtn) {
        subBtn.addEventListener('click', function() {
          setTimeout(function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ACTION_COMPLETED', action: 'SUBSCRIBE'
            }));
          }, 1500);
        });
        clearInterval(checkInterval);
      }
    }, 1000);
    setTimeout(function() {
      var subscribedBtn = document.querySelector('button[aria-label*="Unsubscribe"]') ||
                          document.querySelector('[subscribed]');
      if (subscribedBtn) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ACTION_COMPLETED', action: 'SUBSCRIBE'
        }));
      }
    }, 2000);
  })();
  true;
`;

const COMMENT_DETECTION_SCRIPT = `
  (function() {
    var checkInterval = setInterval(function() {
      var submitBtn = document.querySelector('#submit-button button') ||
                      document.querySelector('button[aria-label="Comment"]') ||
                      document.querySelector('yt-button-shape[id*="submit"] button');
      if (submitBtn) {
        submitBtn.addEventListener('click', function() {
          setTimeout(function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ACTION_COMPLETED', action: 'COMMENT'
            }));
          }, 1500);
        });
        clearInterval(checkInterval);
      }
    }, 1000);
  })();
  true;
`;

export default function YouTubeWebView({ task, actionType, onReturnToApp }) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const completedRef = useRef(false);
  const toastTimerRef = useRef(null);

  const minSec = TASK_MIN_SECONDS[actionType] ?? task?.watchTimeRequired ?? 30;
  const dur = actionType === 'watch' ? (task?.watchTimeRequired ?? 60) : minSec;

  const [secondsLeft, setSecondsLeft] = useState(dur);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const timerPausedRef = useRef(false);
  const [actionCompleted, setActionCompleted] = useState(false);

  const showToast = (msg, duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), duration);
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOGIN_STATUS') {
        if (!data.loggedIn && actionType !== 'watch') {
          showToast('Please log into YouTube first to complete this task');
        }
      }
      if (data.type === 'ACTION_COMPLETED') {
        setActionCompleted(true);
        showToast('✅ Action detected! Tap "Return to App" to claim your coins.');
      }
    } catch(e) {}
  };

  const handleTimerComplete = async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (actionType === 'watch') {
      onReturnToApp({ success: true });
    } else {
      setTimerDone(true);
      // Unlock the WebView so user can interact with YouTube UI
      webViewRef.current?.injectJavaScript(UNLOCK_SCRIPT);
    }
  };

  // Main countdown — only ticks when timerStarted=true and not paused
  useEffect(() => {
    const interval = setInterval(() => {
      if (!timerStarted || timerPausedRef.current) return;
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStarted]);

  // Inject action-detection scripts once timer is done
  useEffect(() => {
    if (!timerDone) return;
    if (actionType === 'like') {
      webViewRef.current?.injectJavaScript(LIKE_DETECTION_SCRIPT);
    } else if (actionType === 'subscribe') {
      webViewRef.current?.injectJavaScript(SUBSCRIBE_DETECTION_SCRIPT);
    } else if (actionType === 'comment') {
      webViewRef.current?.injectJavaScript(COMMENT_DETECTION_SCRIPT);
    }
  }, [timerDone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      completedRef.current = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const progressPct = ((dur - secondsLeft) / dur) * 100;

  // Label shown on the floating pill after timer ends
  const actionLabel = {
    subscribe: 'Subscribe',
    like: 'Like',
    comment: 'Comment',
  }[actionType] ?? '';

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      {/* ── YouTube WebView ── */}
      <WebView
        ref={webViewRef}
        source={{ uri: task.videoUrl }}
        style={s.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        injectedJavaScript={LOCK_SCRIPT + '\n' + LOGIN_CHECK_SCRIPT}
        injectedJavaScriptBeforeContentLoaded={LOCK_SCRIPT}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        mixedContentMode="always"
        originWhitelist={['*']}
        onMessage={handleWebViewMessage}
        onNavigationStateChange={(navState) => {
          const url = navState.url || '';
          if (url.includes('accounts.google.com') || url.includes('google.com/signin')) {
            timerPausedRef.current = true;
            setTimerPaused(true);
          } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            timerPausedRef.current = false;
            setTimerPaused(false);
            setTimerStarted(true);
          }
        }}
        onError={(e) => console.log('WebView error:', e.nativeEvent)}
      />

      {/* ══════════════════════════════════════════════
          TIMER PHASE: overlay + full floating bar
          Visible only while timer is running
      ══════════════════════════════════════════════ */}
      {!timerDone && (
        <>
          {/* Back / exit button — top-left */}
          <TouchableOpacity
            onPress={() => onReturnToApp({ success: false })}
            style={s.backBtn}
          >
            <Text style={s.backBtnTxt}>✕</Text>
          </TouchableOpacity>

          {/* Transparent overlay — blocks all touches during countdown */}
          <TouchableOpacity
            activeOpacity={1}
            pointerEvents={!timerDone ? 'auto' : 'none'}
            onPress={() => {
              if (!timerStarted) {
                showToast('Please wait for the video to load…');
              } else if (timerPaused) {
                showToast('Timer paused — sign in to YouTube to continue.');
              } else {
                const msgs = {
                  watch: 'Watch the full video to earn coins',
                  subscribe: 'Subscribe to the channel to earn coins',
                  like: 'Like the video to earn coins',
                  comment: 'Comment on the video to earn coins',
                };
                showToast(msgs[actionType] || 'Complete the task to earn coins');
              }
            }}
            style={s.lockOverlay}
          />

          {/* Floating timer bar — bottom centre */}
          <View style={s.timerBar}>
            <View style={s.timerBarRow}>
              <Text style={s.timerBarCoins}>🪙 {task.coinsReward} Coins</Text>
              <Text style={s.timerBarTime}>
                {timerPaused
                  ? '⏳ Paused'
                  : !timerStarted
                  ? '⏳ Loading…'
                  : `⏳ ${fmt(secondsLeft)} left`}
              </Text>
            </View>
            {actionType === 'watch'     && <Text style={s.timerBarHint}>Watch the full video to earn coins</Text>}
            {actionType === 'subscribe' && <Text style={s.timerBarHint}>Subscribe to the channel to earn coins</Text>}
            {actionType === 'like'      && <Text style={s.timerBarHint}>Like the video to earn coins</Text>}
            {actionType === 'comment'   && <Text style={s.timerBarHint}>Comment on the video to earn coins</Text>}
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: timerStarted ? `${progressPct}%` : '0%' }]} />
            </View>
          </View>
        </>
      )}

      {/* ══════════════════════════════════════════════
          POST-TIMER PHASE (subscribe / like / comment)
          Overlay is GONE so user can touch the YouTube page.
          Only a small floating pill remains at bottom-right.
      ══════════════════════════════════════════════ */}
      {timerDone && (
        <View style={s.returnPill}>
          {/* Status badge */}
          <View style={[s.statusBadge, actionCompleted && s.statusBadgeDone]}>
            <Text style={s.statusBadgeTxt}>
              {actionCompleted
                ? `✅ ${actionLabel} done!`
                : `⏳ ${actionLabel} first…`}
            </Text>
          </View>

          {/* Return button */}
          <TouchableOpacity
            style={[s.returnBtn, actionCompleted ? s.returnBtnActive : s.returnBtnGray]}
            onPress={() => {
              if (actionCompleted) {
                onReturnToApp({ success: true, actionVerified: true });
              } else {
                showToast(
                  `Action incomplete! You must ${actionLabel.toLowerCase()} first to claim your coins.`,
                  4000
                );
              }
            }}
          >
            <Text style={s.returnBtnTxt}>Return to App</Text>
          </TouchableOpacity>
        </View>
      )}

      <ToastPill message={toastMessage} visible={toastVisible} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },

  // ── Timer-phase elements ──────────────────────────────────────────
  backBtn: {
    position: 'absolute', top: 16, left: 16, zIndex: 1001,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnTxt: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  lockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    bottom: 110, // leave room for the timer bar
    zIndex: 999,
    backgroundColor: 'transparent',
  },

  timerBar: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    zIndex: 1000, elevation: 12,
    shadowColor: '#000', shadowOpacity: 0.18,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  timerBarRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  timerBarCoins: { fontSize: 15, fontWeight: '800', color: '#121212' },
  timerBarTime:  { fontSize: 15, fontWeight: '800', color: '#121212' },
  timerBarHint:  { fontSize: 13, color: '#3366FF', textAlign: 'center', fontWeight: '700', marginBottom: 8 },
  progressTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 6, backgroundColor: '#3366FF', borderRadius: 3 },

  // ── Post-timer floating pill (bottom-right corner) ────────────────
  returnPill: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    zIndex: 1001,
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeDone: {
    backgroundColor: 'rgba(16,185,129,0.9)',
  },
  statusBadgeTxt: {
    color: '#FFF', fontSize: 12, fontWeight: '700',
  },
  returnBtn: {
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 24, elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.25,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  returnBtnActive: { backgroundColor: '#10B981' },
  returnBtnGray:   { backgroundColor: '#6B7280' },
  returnBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
