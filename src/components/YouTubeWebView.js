import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import ToastPill from './ToastPill';
import { markTimerCompleted } from '../services/completedTasksService';

const { width: SW } = Dimensions.get('window');
const fmt = (s) => {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
};

const TASK_MIN_SECONDS = { watch: 0, subscribe: 30, like: 20, comment: 45 };

// ─────────────────────────────────────────────────────────────────────────────
// Lock / Unlock scripts — disable all touch interaction during countdown
// ─────────────────────────────────────────────────────────────────────────────
const LOCK_SCRIPT = `
  (function() {
    if (window.__tuberiseLockApplied) return true;
    window.__tuberiseLockApplied = true;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    var absorb = function(e) {
      e.stopPropagation();
      e.preventDefault();
    };
    window.__tuberiseAbsorb = absorb;
    var events = ['touchstart','touchmove','touchend',
      'pointerdown','pointermove','pointerup',
      'mousedown','click'];
    events.forEach(function(ev) {
      document.addEventListener(ev, absorb,
        { passive: false, capture: true });
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
        document.removeEventListener(ev,
          window.__tuberiseAbsorb, { capture: true });
      });
    }
    window.__tuberiseLockApplied = false;
    window.__tuberiseAbsorb = null;
    window.__tuberiseEvents = null;
  })();
  true;
`;

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2 — Login check with 5 s initial delay + 3-attempt retry (2 s apart).
// Only concludes "logged out" after ALL three attempts fail to find the avatar.
// ─────────────────────────────────────────────────────────────────────────────
const LOGIN_CHECK_SCRIPT = `
  (function() {
    var MAX_ATTEMPTS = 3;
    var RETRY_DELAY  = 2000;   // ms between retries

    var avatarSelectors = [
      '#avatar-btn',
      'button[aria-label="Account menu"]',
      'yt-img-shadow.ytd-topbar-menu-button-renderer',
      '#masthead #avatar-btn',
      'button.ytd-topbar-menu-button-renderer',
      '[data-sessionlink*="logged"]',
      'a[aria-label*="Switch account"]',
      'ytd-account-item-renderer',
      '#avatar-container'
    ];

    var signInSelectors = [
      'a[href*="accounts.google.com"]',
      'yt-button-renderer[is-paper-button] a[href*="signin"]',
      'paper-button[aria-label="Sign in"]'
    ];

    function findAvatar() {
      for (var i = 0; i < avatarSelectors.length; i++) {
        if (document.querySelector(avatarSelectors[i])) return true;
      }
      return false;
    }

    function findSignIn() {
      for (var j = 0; j < signInSelectors.length; j++) {
        if (document.querySelector(signInSelectors[j])) return true;
      }
      return false;
    }

    function hasCookie() {
      return document.cookie.indexOf('SID=')   !== -1 ||
             document.cookie.indexOf('SSID=')  !== -1 ||
             document.cookie.indexOf('APISID=') !== -1;
    }

    function attempt(count) {
      try {
        var avatarFound = findAvatar();
        var cookieOk    = hasCookie();

        if (avatarFound || cookieOk) {
          // Confirmed logged in on this attempt
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LOGIN_STATUS',
            loggedIn: true,
            debug: { attempt: count, foundAvatar: avatarFound, hasCookie: cookieOk }
          }));
          return;
        }

        if (count < MAX_ATTEMPTS) {
          // Avatar not found yet — retry after RETRY_DELAY
          setTimeout(function() { attempt(count + 1); }, RETRY_DELAY);
          return;
        }

        // All attempts exhausted — fall back to sign-in-button check
        var signInPresent = findSignIn();
        var isLoggedIn    = !signInPresent;   // no sign-in button → likely logged in
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'LOGIN_STATUS',
          loggedIn: isLoggedIn,
          finalCheck: true,
          debug: { attempt: count, foundAvatar: false, hasCookie: false, signInPresent: signInPresent }
        }));
      } catch(e) {
        // On any error, fail open (assume logged in to avoid false banners)
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'LOGIN_STATUS',
          loggedIn: true,
          finalCheck: true,
          debug: { error: e.toString() }
        }));
      }
    }

    // FIX 2: 5 000 ms initial delay (was 4 000 ms) so the page has time to render
    setTimeout(function() { attempt(1); }, 5000);
  })();
  true;
`;

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3 — Best-effort email extraction to detect account mismatch.
// Built as a factory function so expectedEmail is baked into the script string.
// Only posts ACCOUNT_MISMATCH if an email IS found AND it differs from expected.
// If no email is found in the DOM, this script does nothing (best-effort only).
// ─────────────────────────────────────────────────────────────────────────────
const buildEmailCheckScript = (expectedEmail) => `
  (function() {
    var expected = ${JSON.stringify((expectedEmail || '').toLowerCase())};
    if (!expected) return;   // no expected email → nothing to compare

    setTimeout(function() {
      try {
        var foundEmail = null;
        var emailRe = /[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}/;

        // 1. Check aria-label of Google Account button (sometimes contains email)
        var accountBtn = document.querySelector('[aria-label*="Google Account"]');
        if (accountBtn) {
          var lbl = accountBtn.getAttribute('aria-label') || '';
          var m = lbl.match(emailRe);
          if (m) foundEmail = m[0];
        }

        // 2. Walk nearby account-related elements
        if (!foundEmail) {
          var candidates = document.querySelectorAll(
            '[class*="account"], [class*="Account"], [class*="profile"], ytd-account-item-renderer'
          );
          for (var i = 0; i < candidates.length; i++) {
            var txt = (candidates[i].textContent || '').trim();
            var m2 = txt.match(emailRe);
            if (m2) { foundEmail = m2[0]; break; }
          }
        }

        // 3. Scan header/topbar area for any email-looking text
        if (!foundEmail) {
          var header = document.querySelector('#masthead, #content, ytd-masthead');
          if (header) {
            var headerTxt = header.textContent || '';
            var m3 = headerTxt.match(emailRe);
            if (m3) foundEmail = m3[0];
          }
        }

        if (foundEmail && foundEmail.toLowerCase() !== expected) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ACCOUNT_MISMATCH',
            foundEmail: foundEmail,
            expectedEmail: expected
          }));
        }
        // If foundEmail is null → no warning (best-effort, YouTube often hides it)
      } catch(e) {}
    }, 3000);   // 3 s after login confirmed
  })();
  true;
`;

// ─────────────────────────────────────────────────────────────────────────────
// Action-detection scripts (injected after timer ends)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function YouTubeWebView({
  task,
  actionType,
  onReturnToApp,
  userEmail,
  expectedEmail,   // FIX 3 — new prop; pass user.email from TaskDetailScreen
  reducedTimer,
}) {
  const insets = useSafeAreaInsets();
  const webViewRef    = useRef(null);
  const completedRef  = useRef(false);
  const toastTimerRef = useRef(null);

  const dur = reducedTimer
    ? 5
    : actionType === 'watch'
      ? (task?.watchTimeRequired ?? 60)
      : (TASK_MIN_SECONDS[actionType] ?? 30);

  const [secondsLeft,     setSecondsLeft]     = useState(dur);
  const [toastMessage,    setToastMessage]     = useState('');
  const [toastVisible,    setToastVisible]     = useState(false);
  const [timerDone,       setTimerDone]        = useState(false);
  const [timerStarted,    setTimerStarted]     = useState(false);
  const [timerPaused,     setTimerPaused]      = useState(false);
  const timerPausedRef = useRef(false);
  const [actionCompleted, setActionCompleted]  = useState(false);
  const [ytLoggedIn,      setYtLoggedIn]       = useState(false);
  const [loginCheckFinished, setLoginCheckFinished] = useState(false);
  // FIX 3 — account mismatch warning state
  const [mismatchWarning, setMismatchWarning]  = useState('');

  const showToast = (msg, duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), duration);
  };

  // ── Message handler ──────────────────────────────────────────────────────
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // ── Login status ──
      if (data.type === 'LOGIN_STATUS') {
        console.log('LOGIN_STATUS received:', data);
        if (data.loggedIn) {
          setYtLoggedIn(true);
          setLoginCheckFinished(true);
          setTimerStarted(true);
          webViewRef.current?.injectJavaScript(LOCK_SCRIPT);
          // FIX 3 — inject email check 3 s after login confirmed
          const emailScript = buildEmailCheckScript(expectedEmail || userEmail || '');
          webViewRef.current?.injectJavaScript(emailScript);
        } else {
          setYtLoggedIn(false);
          // Only mark check finished if it's the final attempt
          if (data.finalCheck) {
             setLoginCheckFinished(true);
             webViewRef.current?.injectJavaScript(UNLOCK_SCRIPT);
             if (actionType !== 'watch') {
               showToast('Please log into YouTube first to complete this task');
             }
          }
        }
      }

      // ── Action completed ──
      if (data.type === 'ACTION_COMPLETED') {
        setActionCompleted(true);
        showToast('✅ Action detected! Tap "Return to App" to claim your coins.');
      }

      // ── FIX 3 — Account mismatch warning (non-blocking) ──
      if (data.type === 'ACCOUNT_MISMATCH') {
        const { foundEmail, expectedEmail: exp } = data;
        const warningMsg =
          `⚠️ You're signed into YouTube as ${foundEmail}.\n` +
          `Switch to ${exp} for this to count, or your action may not be verified correctly.`;
        setMismatchWarning(warningMsg);
        console.warn('ACCOUNT_MISMATCH:', data);
      }
    } catch(e) {}
  };

  // ── Timer complete ───────────────────────────────────────────────────────
  const handleTimerComplete = async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (actionType === 'watch') {
      onReturnToApp({ success: true });
    } else {
      setTimerDone(true);
      webViewRef.current?.injectJavaScript(UNLOCK_SCRIPT);
    }
  };

  // ── Countdown ticker ────────────────────────────────────────────────────
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

  // ── Inject action-detection scripts once timer ends ─────────────────────
  useEffect(() => {
    if (!timerDone) return;
    if      (actionType === 'like')      webViewRef.current?.injectJavaScript(LIKE_DETECTION_SCRIPT);
    else if (actionType === 'subscribe') webViewRef.current?.injectJavaScript(SUBSCRIBE_DETECTION_SCRIPT);
    else if (actionType === 'comment')   webViewRef.current?.injectJavaScript(COMMENT_DETECTION_SCRIPT);
  }, [timerDone]);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      completedRef.current = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Fallback: assume logged in after 8 s (safety net) ───────────────────
  useEffect(() => {
    const fallback = setTimeout(() => {
      if (!timerStarted) {
        console.log('Login check timeout - assuming logged in');
        setYtLoggedIn(true);
        setLoginCheckFinished(true);
        setTimerStarted(true);
      }
    }, 8000);
    return () => clearTimeout(fallback);
  }, [timerStarted]);

  const progressPct = ((dur - secondsLeft) / dur) * 100;

  const actionLabel = {
    subscribe: 'Subscribe',
    like: 'Like',
    comment: 'Comment',
  }[actionType] ?? '';

  // ── Render ───────────────────────────────────────────────────────────────
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
            webViewRef.current?.injectJavaScript(LOGIN_CHECK_SCRIPT);
            if (ytLoggedIn) setTimerStarted(true);
          }
        }}
      />

      {/* ══════════════════════════════════════════════════════════
          TIMER PHASE: overlay + floating bar
      ══════════════════════════════════════════════════════════ */}
      {!timerDone && (
        <>
          {/* Back / exit button */}
          <TouchableOpacity
            onPress={() => onReturnToApp({ success: false })}
            style={s.backBtn}
          >
            <Text style={s.backBtnTxt}>✕</Text>
          </TouchableOpacity>

          {/* "Please sign in" banner — only if NOT logged in after all retries */}
          {!ytLoggedIn && !timerStarted && loginCheckFinished && (
            <View style={s.ytLoginBanner} pointerEvents="none">
              <Text style={s.ytLoginBannerTxt}>⚠️ Please sign in to YouTube with:</Text>
              <Text style={s.ytLoginEmailTxt}>{userEmail || 'your Google account'}</Text>
              <Text style={s.ytLoginSubTxt}>Use the same account in all sections</Text>
            </View>
          )}

          {/* Signed-in email pill */}
          {ytLoggedIn && !timerDone && (
            <View style={s.accountPill} pointerEvents="none">
              <Text style={s.accountPillTxt}>📧 Signed in as: {userEmail}</Text>
            </View>
          )}

          {/* FIX 3 — Account mismatch warning banner (non-blocking) */}
          {!!mismatchWarning && (
            <TouchableOpacity
              style={s.mismatchBanner}
              onPress={() => setMismatchWarning('')}
              activeOpacity={0.85}
            >
              <Text style={s.mismatchBannerTxt}>{mismatchWarning}</Text>
              <Text style={s.mismatchDismiss}>Tap to dismiss</Text>
            </TouchableOpacity>
          )}

          {/* FIX 1 — Transparent touch blocker.
              We want this to render IMMEDIATELY so touches are blocked
              even before the webview finishes loading. */}
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
                  watch:     'Watch the full video to earn coins',
                  subscribe: 'Subscribe to the channel to earn coins',
                  like:      'Like the video to earn coins',
                  comment:   'Comment on the video to earn coins',
                };
                showToast(msgs[actionType] || 'Complete the task to earn coins');
              }
            }}
            style={[s.lockOverlay, { bottom: Math.max(140, insets.bottom + 8 + 100) }]}
          />

          {/* FIX 1 — Floating timer bar raised to safe bottom */}
          <View style={[s.timerBar, { bottom: insets.bottom + 8 }]}>
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
            {reducedTimer ? (
              <Text style={s.timerBarHint}>⚡ Quick verify — 5 seconds only!</Text>
            ) : (
              <>
                {actionType === 'watch'     && <Text style={s.timerBarHint}>Watch the full video to earn coins</Text>}
                {actionType === 'subscribe' && <Text style={s.timerBarHint}>Subscribe to the channel to earn coins</Text>}
                {actionType === 'like'      && <Text style={s.timerBarHint}>Like the video to earn coins</Text>}
                {actionType === 'comment'   && <Text style={s.timerBarHint}>Comment on the video to earn coins</Text>}
              </>
            )}
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: timerStarted ? `${progressPct}%` : '0%' }]} />
            </View>
          </View>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          POST-TIMER PHASE — overlay gone, small action pill only
      ══════════════════════════════════════════════════════════ */}
      {timerDone && (
        <>
          <TouchableOpacity
            onPress={async () => {
              if (userEmail && task?.id) {
                await markTimerCompleted(userEmail, task.id);
              }
              onReturnToApp({ success: false });
            }}
            style={s.backBtn}
          >
            <Text style={s.backBtnTxt}>✕</Text>
          </TouchableOpacity>

          <View style={[s.returnPill, { bottom: insets.bottom + 8 }]}>
            <View style={[s.statusBadge, actionCompleted && s.statusBadgeDone]}>
              <Text style={s.statusBadgeTxt}>
                {actionCompleted ? `✅ ${actionLabel} done!` : `⏳ ${actionLabel} first…`}
              </Text>
            </View>

            <TouchableOpacity
              style={[s.returnBtn, actionCompleted ? s.returnBtnActive : s.returnBtnGray]}
              onPress={() => {
                if (actionCompleted) {
                  onReturnToApp({ success: true, actionVerified: true });
                } else {
                  showToast(
                    `Action incomplete! You must ${actionLabel.toLowerCase()} first to claim your coins.`,
                    4000,
                  );
                }
              }}
            >
              <Text style={s.returnBtnTxt}>Return to App</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ToastPill message={toastMessage} visible={toastVisible} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview:   { flex: 1 },

  // ── Back button ────────────────────────────────────────────────────────────
  backBtn: {
    position: 'absolute', top: 16, left: 16, zIndex: 1001,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnTxt: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  // ── FIX 1: lockOverlay bottom raised to match timer bar ─────────────
  lockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 999,
    backgroundColor: 'transparent',
  },

  // ── FIX 1: timerBar raised ──────────────────
  timerBar: {
    position: 'absolute', left: 16, right: 16,
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

  // ── Post-timer return pill ─────────────────────────────────────────────────
  returnPill: {
    position: 'absolute', right: 16,
    zIndex: 1001, alignItems: 'flex-end', gap: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statusBadgeDone: { backgroundColor: 'rgba(16,185,129,0.9)' },
  statusBadgeTxt:  { color: '#FFF', fontSize: 12, fontWeight: '700' },
  returnBtn: {
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 24, elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.25,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  returnBtnActive: { backgroundColor: '#10B981' },
  returnBtnGray:   { backgroundColor: '#6B7280' },
  returnBtnTxt:    { color: '#FFF', fontWeight: '800', fontSize: 14 },

  // ── Sign-in banner (only shown after all retries fail) ────────────────────
  ytLoginBanner: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
    paddingVertical: 14, paddingHorizontal: 16,
    zIndex: 1001, alignItems: 'center',
  },
  ytLoginBannerTxt: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  ytLoginEmailTxt:  { color: '#FFD700', fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  ytLoginSubTxt:    { color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center', marginTop: 2 },

  // ── Signed-in email pill ──────────────────────────────────────────────────
  accountPill: {
    position: 'absolute', top: 8, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, zIndex: 1001,
  },
  accountPillTxt: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // ── FIX 3: Account mismatch warning banner ────────────────────────────────
  mismatchBanner: {
    position: 'absolute',
    top: 60,           // below the email pill
    left: 12, right: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.95)',   // amber
    borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    zIndex: 1002,
    shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 10,
  },
  mismatchBannerTxt: {
    color: '#FFFFFF', fontSize: 13, fontWeight: '600',
    lineHeight: 19, marginBottom: 4,
  },
  mismatchDismiss: {
    color: 'rgba(255,255,255,0.75)', fontSize: 11,
    textAlign: 'right', fontStyle: 'italic',
  },
});
