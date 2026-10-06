import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import ToastPill from './ToastPill';
import { markTimerCompleted } from '../services/completedTasksService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const { width: SW } = Dimensions.get('window');
const fmt = (s) => {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
};

const TASK_MIN_SECONDS = { watch: 0, subscribe: 30, like: 20, comment: 45 };

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: LOCK_SCRIPT and UNLOCK_SCRIPT have been REMOVED.
// Touch blocking is now handled entirely by a React Native View overlay
// (rnTouchBlocker). No JavaScript injection is needed for locking/unlocking.
// ─────────────────────────────────────────────────────────────────────────────

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
// IDENTITY CHECK SCRIPT  (Fix #2)
// – Calls /youtubei/v1/account/account_menu via ytcfg to get the active handle.
// – Falls back to parsing ytInitialData if the API doesn't expose a handle.
// – Polls up to 5 times, 3 s apart.
// – Posts IDENTITY_RESULT { match, activeHandle, appHandle } to React Native.
// – Logs every raw header key under [Identity] so we can see what is available.
// ─────────────────────────────────────────────────────────────────────────────
const buildIdentityCheckScript = (appHandle) => `
  (function() {
    if (window.__tuberiseIdentityChecking) return;
    window.__tuberiseIdentityChecking = true;

    var APP_HANDLE = ${JSON.stringify('__HANDLE_PLACEHOLDER__')};
    var MAX_POLLS  = 5;
    var POLL_DELAY = 3000;
    var pollCount  = 0;

    function normaliseHandle(h) {
      if (!h) return '';
      return h.toLowerCase().replace(/^@/, '').trim();
    }

    function extractHandleFromInitialData() {
      try {
        if (!window.ytInitialData) return null;
        var str = JSON.stringify(window.ytInitialData);
        var m = str.match(/"handle"\\s*:\\s*\\{[^}]*"simpleText"\\s*:\\s*"(@[^"]+)"/);
        if (m) return m[1];
        var m2 = str.match(/"channelHandleText"[^}]+"text"\\s*:\\s*"(@[^"]+)"/);
        if (m2) return m2[1];
      } catch(e) {}
      return null;
    }

    function doCheck() {
      pollCount++;
      try {
        if (window.ytcfg && window.ytcfg.get) {
          var apiKey = window.ytcfg.get('INNERTUBE_API_KEY') || window.ytcfg.get('INNERTUBE_KEY');
          var ctx    = window.ytcfg.get('INNERTUBE_CONTEXT');
          if (apiKey && ctx) {
            fetch('/youtubei/v1/account/account_menu?key=' + apiKey, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ context: ctx })
            })
            .then(function(r) { return r.json(); })
            .then(function(json) {
              var activeHandle = null;
              try {
                var str = JSON.stringify(json);
                var topKeys = Object.keys(json);
                console.log('[Identity] account_menu top keys:', JSON.stringify(topKeys));
                var sections = json && json.header && json.header.activeAccountHeaderRenderer;
                if (sections) {
                  var hKeys = Object.keys(sections);
                  console.log('[Identity] activeAccountHeaderRenderer keys:', JSON.stringify(hKeys));
                  if (sections.channelHandle && sections.channelHandle.simpleText) {
                    activeHandle = sections.channelHandle.simpleText;
                  }
                  if (!activeHandle && sections.email && sections.email.simpleText) {
                    activeHandle = sections.email.simpleText;
                  }
                  if (!activeHandle && sections.accountName && sections.accountName.simpleText) {
                    activeHandle = sections.accountName.simpleText;
                  }
                }
                if (!activeHandle) {
                  var m = str.match(/"channelHandle"\\s*:\\s*\\{[^}]*"simpleText"\\s*:\\s*"(@[^"]+)"/);
                  if (m) activeHandle = m[1];
                }
                if (!activeHandle) {
                  var m2 = str.match(/"handle"\\s*:\\s*\\{[^}]*"simpleText"\\s*:\\s*"(@[^"]+)"/);
                  if (m2) activeHandle = m2[1];
                }
                if (!activeHandle) {
                  var m3 = str.match(/"email"\\s*:\\s*\\{[^}]*"simpleText"\\s*:\\s*"([^"@]+@[^"]+)"/);
                  if (m3) activeHandle = m3[1];
                }
                console.log('[Identity] account_menu resolved activeHandle:', activeHandle);
              } catch(pe) {
                console.log('[Identity] parse error:', pe && pe.toString());
              }
              if (!activeHandle) {
                activeHandle = extractHandleFromInitialData();
                console.log('[Identity] ytInitialData fallback handle:', activeHandle);
              }
              reportResult(activeHandle);
            })
            .catch(function(fetchErr) {
              console.log('[Identity] account_menu fetch error:', fetchErr && fetchErr.toString());
              var h = extractHandleFromInitialData();
              reportResult(h);
            });
            return;
          }
        }
        var h = extractHandleFromInitialData();
        reportResult(h);
      } catch(e) {
        console.log('[Identity] doCheck error:', e && e.toString());
        reportResult(null);
      }
    }

    function reportResult(activeHandle) {
      var normActive = normaliseHandle(activeHandle);
      var normApp    = normaliseHandle(APP_HANDLE);
      var match = false;
      if (normActive && normApp) {
        match = normActive === normApp ||
                normActive.replace(/^@/, '') === normApp.replace(/^@/, '');
      }
      console.log('[Identity] IDENTITY_RESULT — activeHandle:', activeHandle,
                  '| appHandle:', APP_HANDLE, '| match:', match, '| poll:', pollCount);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'IDENTITY_RESULT',
        match: match,
        activeHandle: activeHandle || null,
        appHandle: APP_HANDLE || null
      }));
      if (!activeHandle && pollCount < MAX_POLLS) {
        setTimeout(doCheck, POLL_DELAY);
      } else {
        window.__tuberiseIdentityChecking = false;
      }
    }

    doCheck();
  })();
  true;
`;
// NOTE: The placeholder __HANDLE_PLACEHOLDER__ is replaced at call-time by
// buildIdentityCheckScript() using a string replace before injection.

// ─────────────────────────────────────────────────────────────────────────────
// Action-detection scripts
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// FIX 2 — Like detection: checks immediately (catches pre-liked videos) +
// polls every 3 s. Broad aria-pressed selectors for all YT layouts.
// ─────────────────────────────────────────────────────────────────────────────
const buildLikeDetectionScript = (taskVideoId) => `
  (function() {
    if (window.__tuberiseLikeDetecting) return true;
    window.__tuberiseLikeDetecting = true;
    
    var expectedVideoId = ${JSON.stringify(taskVideoId)};

    function isLiked() {
      // Must be on the correct video
      if (expectedVideoId) {
        var match = location.href.match(/(?:v=|youtu\\.be\\/|\\/shorts\\/|\\/embed\\/)([A-Za-z0-9_-]{11})/);
        var currentVideoId = match ? match[1] : null;
        if (currentVideoId && currentVideoId !== expectedVideoId) {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WRONG_VIDEO', current: currentVideoId, expected: expectedVideoId }));
           return false;
        }
      }

      var selectors = [
        'like-button-view-model button[aria-pressed="true"]',
        'button[aria-label*="like this video" i][aria-pressed="true"]'
      ];
      
      for (var i = 0; i < selectors.length; i++) {
        var el = document.querySelector(selectors[i]);
        if (el) {
           var aria = el.getAttribute('aria-label') || '';
           if (aria.toLowerCase().indexOf('dislike') === -1) {
             return selectors[i];
           }
        }
      }
      return false;
    }

    function report(matchedSelector) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'LIKE_DEBUG', href: location.href, selector: matchedSelector
      }));
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ACTION_COMPLETED', action: 'LIKE'
      }));
      clearInterval(window.__tuberiseLikeInterval);
      window.__tuberiseLikeDetecting = false;
    }

    var matched = isLiked();
    if (matched) { report(matched); return true; }

    window.__tuberiseLikeInterval = setInterval(function() {
      var m = isLiked();
      if (m) report(m);
    }, 3000);
  })();
  true;
`;

// ─────────────────────────────────────────────────────────────────────────────
// FIX 4 — Subscribe detection: checks immediately (already-subscribed) +
// polls every 3 s.
// ─────────────────────────────────────────────────────────────────────────────
const SUBSCRIBE_DETECTION_SCRIPT = `
  (function() {
    if (window.__tuberiseSubDetecting) return true;
    window.__tuberiseSubDetecting = true;

    function isSubscribed() {
      return !!(
        document.querySelector('button[aria-label*="Unsubscribe"]') ||
        document.querySelector('[subscribed]') ||
        document.querySelector('yt-subscribe-button-view-model [subscribed]') ||
        document.querySelector('subscribe-button-view-model button[aria-label*="Unsubscribe" i]')
      );
    }

    function report() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ACTION_COMPLETED', action: 'SUBSCRIBE'
      }));
      clearInterval(window.__tuberiseSubInterval);
      window.__tuberiseSubDetecting = false;
    }

    // Check immediately — user might already be subscribed
    if (isSubscribed()) { report(); return true; }

    // Poll every 3 seconds
    window.__tuberiseSubInterval = setInterval(function() {
      if (isSubscribed()) report();
    }, 3000);
  })();
  true;
`;

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3 — Comment detection: waits for submit button to appear, then
// listens for its click event and reports ACTION_COMPLETED.
// ─────────────────────────────────────────────────────────────────────────────
const buildCommentDetectionScript = (taskVideoId) => `
  (function() {
    if (window.__tuberiseCommentDetecting) return true;
    window.__tuberiseCommentDetecting = true;

    var expectedVideoId = ${JSON.stringify(taskVideoId)};
    var pending = false;

    function inCommentBox(el) {
      var node = el;
      while (node) {
        var tag = (node.tagName || '').toLowerCase();
        var id  = (node.id || '').toLowerCase();
        var cls = (node.className && typeof node.className === 'string' ? node.className : '').toLowerCase();
        if (tag.indexOf('comment') !== -1 || id.indexOf('comment') !== -1 || cls.indexOf('comment') !== -1) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    }

    function getEditor() {
      var candidates = document.querySelectorAll('textarea, [contenteditable="true"]');
      for (var i = 0; i < candidates.length; i++) {
        if (inCommentBox(candidates[i])) return candidates[i];
      }
      return null;
    }

    function editorText(ed) {
      if (!ed) return '';
      var v = typeof ed.value === 'string' ? ed.value : ed.textContent;
      return (v || '').trim();
    }

    function isSubmit(btn) {
      if (!btn) return false;
      if (btn.closest('#submit-button, [id*="submit"]')) return true;
      var label = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
      return label === 'comment';
    }

    document.addEventListener('click', function(e) {
      if (pending) return;
      var btn = e.target.closest('button, [role="button"]');
      if (!isSubmit(btn)) return;
      var ed = getEditor();
      var before = editorText(ed);
      if (!before) return;

      if (expectedVideoId) {
        var match = location.href.match(/(?:v=|youtu\\.be\\/|\\/shorts\\/|\\/embed\\/)([A-Za-z0-9_-]{11})/);
        var currentVideoId = match ? match[1] : null;
        if (currentVideoId && currentVideoId !== expectedVideoId) {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WRONG_VIDEO', current: currentVideoId, expected: expectedVideoId }));
           return;
        }
      }

      pending = true;
      setTimeout(function() {
        var edNow = getEditor();
        var after = editorText(edNow);
        if (!edNow || !after) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ACTION_COMPLETED', action: 'COMMENT'
          }));
        } else {
          pending = false;
        }
      }, 2500);
    }, true);
  })();
  true;
`;

const AUTO_LIKE_SCRIPT = `
  (function() {
    console.log('[Auto-Action] Triggering Like...');
    var likeBtn = document.querySelector('button[aria-label*="like this video"]') || document.querySelector('button[aria-label*="Like"]');
    if (!likeBtn) {
      console.log('[Auto-Action] Like button not found.');
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTO_ACTION_FAILED', action: 'LIKE' }));
      return;
    }
    if (likeBtn.getAttribute('aria-pressed') !== 'true') {
      likeBtn.click();
    }
    console.log('[Auto-Action] Like Triggered');
    setTimeout(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'AUTO_ACTION_COMPLETED', action: 'LIKE'
      }));
    }, 1500);
  })();
  true;
`;

const AUTO_SUBSCRIBE_SCRIPT = `
  (function() {
    console.log('[Auto-Action] Triggering Subscribe...');
    var alreadySubscribed = !!(
      document.querySelector('button[aria-label*="Unsubscribe"]') ||
      document.querySelector('[subscribed]')
    );
    var subBtn = document.querySelector('yt-subscribe-button-view-model button') || document.querySelector('button[aria-label*="Subscribe"]');
    if (!subBtn && !alreadySubscribed) {
      console.log('[Auto-Action] Subscribe button not found and not subscribed.');
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTO_ACTION_FAILED', action: 'SUBSCRIBE' }));
      return;
    }
    if (subBtn && !alreadySubscribed) {
      subBtn.click();
    }
    console.log('[Auto-Action] Subscribe Triggered');
    setTimeout(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'AUTO_ACTION_COMPLETED', action: 'SUBSCRIBE'
      }));
    }, 1500);
  })();
  true;
`;

const AUTO_COMMENT_SCRIPT = `
  (function() {
    console.log('[Auto-Comment] Initializing...');
    var submitted = false;

    // Step 1: Find the Input
    var input = document.querySelector('[contenteditable="true"]') || 
                document.querySelector('.comment-simplebox-text') || 
                document.querySelector('textarea') ||
                document.querySelector('#placeholder-area');
                
    if (!input) {
      console.log('[Auto-Comment] Error: Comment input not found.');
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTO_ACTION_FAILED', action: 'COMMENT' }));
      return;
    }
    console.log('[Auto-Comment] Input Found');

    // Step 2: Focus & Click
    input.focus();
    input.click();
    
    // Short delay to let UI react to focus before typing
    setTimeout(function() {
      // Step 3: Simulated Typing
      var text = "😊👍🔥";
      var success = document.execCommand('insertText', false, text);
      if (!success) {
         // Fallback if execCommand fails on certain mobile environments
         if (typeof input.value !== 'undefined') {
             input.value = text;
         } else {
             input.textContent = text;
         }
      }
      console.log('[Auto-Comment] Text Injected');

      // Step 4: Event Dispatching
      // Explicitly dispatch events to ensure YouTube's React/Lit state detects the change
      var inputEvent = new Event('input', { bubbles: true, cancelable: true });
      var changeEvent = new Event('change', { bubbles: true, cancelable: true });
      var keydownEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', keyCode: 13 });
      
      input.dispatchEvent(keydownEvent);
      input.dispatchEvent(inputEvent);
      input.dispatchEvent(changeEvent);
      
      // Step 5: The Delay (simulate human reading)
      var humanDelay = Math.floor(Math.random() * 500) + 1000; // 1000ms - 1500ms
      setTimeout(function() {
        // Step 6: Find & Click Submit
        var submitBtn = document.querySelector('#submit-button button') || 
                        document.querySelector('button[aria-label="Comment"]') || 
                        document.querySelector('yt-button-shape[id*="submit"] button') ||
                        document.querySelector('#submit-button');
                        
        if (submitBtn) {
          // Check visibility and enabled status
          var isVisible = submitBtn.offsetWidth > 0 || submitBtn.offsetHeight > 0 || submitBtn.getClientRects().length > 0;
          var isDisabled = submitBtn.disabled || submitBtn.getAttribute('aria-disabled') === 'true';
          
          if (isVisible && !isDisabled) {
              submitBtn.click();
              submitted = true;
              console.log('[Auto-Comment] Submit Clicked');
          } else {
              console.log('[Auto-Comment] Error: Submit button found but is hidden or disabled.');
              // Fallback dispatch click in case standard click fails
              submitBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              submitted = true;
          }
        } else {
          console.log('[Auto-Comment] Error: Submit button not found.');
        }

        // Step 7: Final Handshake
        setTimeout(function() {
          console.log('[Auto-Comment] Sequence Complete');
          if (submitted) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'AUTO_ACTION_COMPLETED', action: 'COMMENT'
            }));
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'AUTO_ACTION_FAILED', action: 'COMMENT'
            }));
          }
        }, 1500);

      }, humanDelay);
    }, 500); // 500ms after focus
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
  expectedEmail,
  appHandle,        // @handle from GET /channels?part=snippet&mine=true (passed by TaskDetailScreen)
  reducedTimer,
  autoPlayEnabled,
}) {
  const insets = useSafeAreaInsets();
  const webViewRef      = useRef(null);
  const completedRef    = useRef(false);
  const toastTimerRef   = useRef(null);
  const autoFallbackRef = useRef(null);

  const taskVideoUrlMatch = task.videoUrl?.match(
    /(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/
  );
  const taskVideoId = taskVideoUrlMatch?.[1];
  const latestWebViewVideoIdRef = useRef(taskVideoId);

  const dur = reducedTimer ? 5 : (actionType === 'watch' ? (task?.watchTimeRequired ?? 60) : (TASK_MIN_SECONDS[actionType] ?? 30));

  const [secondsLeft,     setSecondsLeft]     = useState(dur);
  const [toastMessage,    setToastMessage]     = useState('');
  const [toastVisible,    setToastVisible]     = useState(false);
  const [timerDone,       setTimerDone]        = useState(false);
  const [timerStarted,    setTimerStarted]     = useState(false);
  const [timerPaused,     setTimerPaused]      = useState(false);
  const timerPausedRef = useRef(false);
  const [actionCompleted, setActionCompleted]  = useState(false);
  const [ytLoggedIn,         setYtLoggedIn]          = useState(false);
  const [loginCheckFinished, setLoginCheckFinished]  = useState(false);

  // ── Identity state ─────────────────────────────────────────────────────────
  // null  = not yet checked / polling
  // true  = confirmed match
  // false = mismatch (handle found but differs)
  const [identityMatch,   setIdentityMatch]   = useState(null);
  const [activeHandle,    setActiveHandle]    = useState(null);   // handle found in WebView
  const [identityChecked, setIdentityChecked] = useState(false);  // at least one result received
  const [fixingAccount,   setFixingAccount]   = useState(false);  // in logout/fix flow

  const [muted,           setMuted]           = useState(true);
  const [barHeight,       setBarHeight]       = useState(0);

  const timerStartedAtRef = useRef(null);

  // [Session] Log current app email / appHandle on mount so we can trace identity
  useEffect(() => {
    (async () => {
      const owner = await AsyncStorage.getItem('ytSessionOwner').catch(() => null);
      console.log('[Session] mount — appEmail:', userEmail, '| appHandle:', appHandle, '| ytSessionOwner:', owner);
      // IMPORTANT: We do NOT save ytSessionOwner here.
      // It is saved only after IDENTITY_RESULT { match: true } is received.
      if (owner && owner !== userEmail) {
        console.log('[Session] owner mismatch on mount — owner:', owner, '≠ appEmail:', userEmail);
      }
    })();
  }, [userEmail]);

  const showToast = (msg, duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), duration);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // doStartTimer — called only after identity is confirmed (or fallback fires)
  // ─────────────────────────────────────────────────────────────────────────
  const startTimerOnce = useRef(false);
  const doStartTimer = () => {
    if (startTimerOnce.current) return;
    startTimerOnce.current = true;
    timerStartedAtRef.current = new Date().toISOString();
    setTimerStarted(true);
    setLoginCheckFinished(true);
    setYtLoggedIn(true);
    console.log('[Session] Timer started — identity confirmed. timerStartedAt:', timerStartedAtRef.current);
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // ── LOGIN_STATUS ──────────────────────────────────────────────────────
      if (data.type === 'LOGIN_STATUS') {
        console.log('[Session] LOGIN_STATUS received — loggedIn:', data.loggedIn, '| appEmail:', userEmail, '| debug:', JSON.stringify(data.debug));
        if (data.loggedIn) {
          setYtLoggedIn(true);
          // DO NOT start the timer or save ytSessionOwner here.
          // Trigger the identity check; timer starts only after
          // IDENTITY_RESULT { match: true } is received.
          const handleForCheck = appHandle || userEmail || '';
          console.log('[Identity] Injecting identity check — appHandle:', handleForCheck);
          // Build the script with actual handle substituted
          const identScript = buildIdentityCheckScript(handleForCheck)
            .replace('__HANDLE_PLACEHOLDER__', (handleForCheck).toLowerCase().replace(/^@/, ''));
          webViewRef.current?.injectJavaScript(identScript);
        } else {
          setYtLoggedIn(false);
          console.log('[Session] loggedIn=false — appEmail:', userEmail);
          if (data.finalCheck) {
            setLoginCheckFinished(true);
            if (actionType !== 'watch') showToast('Please log into YouTube first');
          }
        }
      }

      // ── IDENTITY_RESULT ───────────────────────────────────────────────────
      if (data.type === 'IDENTITY_RESULT') {
        const { match, activeHandle: ah, appHandle: aph } = data;
        console.log('[Identity] IDENTITY_RESULT — match:', match, '| activeHandle:', ah, '| appHandle:', aph);
        setActiveHandle(ah);
        setIdentityChecked(true);

        if (match) {
          setIdentityMatch(true);
          // Save ytSessionOwner NOW — identity is verified
          AsyncStorage.setItem('ytSessionOwner', userEmail || '').then(() => {
            console.log('[Session] saved owner (IDENTITY_RESULT match=true):', userEmail);
          }).catch(() => {});
          doStartTimer();
          if (fixingAccount) setFixingAccount(false);
        } else if (ah) {
          // Got a handle but it doesn't match — show mismatch overlay
          setIdentityMatch(false);
          console.log('[Identity] Mismatch — activeHandle:', ah, '≠ appHandle:', aph);
        } else {
          // No handle yet — poll loop inside script will retry automatically
          console.log('[Identity] No handle found on this poll — waiting for retry');
        }
      }

      // ── ACTION_COMPLETED ──────────────────────────────────────────────────
      if (data.type === 'ACTION_COMPLETED') {
        setActionCompleted(true);
        showToast('Detected - tap Return to verify', 4000);
      }

      // ── LIKE_DEBUG ────────────────────────────────────────────────────────
      if (data.type === 'LIKE_DEBUG') {
        console.log(`[LikeDebug] href: ${data.href} | selector: ${data.selector}`);
      }

      // ── WRONG_VIDEO ───────────────────────────────────────────────────────
      if (data.type === 'WRONG_VIDEO') {
        console.log(`[WRONG_VIDEO] current: ${data.current} expected: ${data.expected}`);
        if (actionType !== 'watch' && actionType !== 'subscribe') {
          showToast('Please stay on the task video', 4000);
          webViewRef.current?.goBack();
        }
      }

      // ── AUTO_ACTION_COMPLETED ─────────────────────────────────────────────
      if (data.type === 'AUTO_ACTION_COMPLETED') {
        onReturnToApp({ success: true, actionVerified: true });
      }

      // ── AUTO_ACTION_FAILED ────────────────────────────────────────────────
      if (data.type === 'AUTO_ACTION_FAILED') {
        setTimerDone(true);
        showToast('Auto-action failed. Please do it manually, then tap Return to App.', 4000);
      }

      // ── MUTE_STATE ────────────────────────────────────────────────────────
      if (data.type === 'MUTE_STATE') {
        setMuted(data.muted);
      }

    } catch (e) { }
  };

const handleTimerComplete = () => {
  if (completedRef.current) return;
  completedRef.current = true;
  if (actionType === 'watch') {
    onReturnToApp({ success: true, webViewVideoId: latestWebViewVideoIdRef.current, timerStartedAt: timerStartedAtRef.current });
    return;
  }
  if (autoPlayEnabled && (actionType === 'like' || actionType === 'subscribe' || actionType === 'comment')) {
    if (actionType === 'like') webViewRef.current?.injectJavaScript(AUTO_LIKE_SCRIPT);
    else if (actionType === 'subscribe') webViewRef.current?.injectJavaScript(AUTO_SUBSCRIBE_SCRIPT);
    else if (actionType === 'comment') webViewRef.current?.injectJavaScript(AUTO_COMMENT_SCRIPT);
    autoFallbackRef.current = setTimeout(() => setTimerDone(true), 10000);
    return;
  }
  // FIX 1: Setting timerDone = true removes the RN overlay — no UNLOCK_SCRIPT needed
  setTimerDone(true);
};

useEffect(() => {
  const interval = setInterval(() => {
    if (!timerStarted) return;
    if (timerPausedRef.current) return;
    setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
  }, 1000);
  return () => clearInterval(interval);
}, [timerStarted]);

useEffect(() => {
  if (timerStarted && secondsLeft <= 0) {
    handleTimerComplete();
  }
}, [secondsLeft, timerStarted]);

useEffect(() => {
  return () => {
    if (autoFallbackRef.current) clearTimeout(autoFallbackRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  };
}, []);

// FIX 1+2+3+4: When timer finishes, the RN overlay is already gone.
// Just inject the relevant detection script — no UNLOCK_SCRIPT needed.
useEffect(() => {
  if (!timerDone) return;
  if (actionType === 'like') {
    // FIX 2: Checks immediately (pre-liked) + polls every 3 s
    webViewRef.current?.injectJavaScript(buildLikeDetectionScript(taskVideoId));
  } else if (actionType === 'subscribe') {
    // FIX 4: Checks immediately (already-subscribed) + polls every 3 s
    webViewRef.current?.injectJavaScript(SUBSCRIBE_DETECTION_SCRIPT);
  } else if (actionType === 'comment') {
    // FIX 3: Inject comment submit detection
    webViewRef.current?.injectJavaScript(buildCommentDetectionScript(taskVideoId));
  }
}, [timerDone]);

// Fallback: if identity check never resolves after 12 s, start timer anyway
// (prevents user being stuck if account_menu fails & no handle is visible anywhere).
useEffect(() => {
  const fallback = setTimeout(() => {
    if (!timerStarted) {
      console.log('[Identity] Fallback fired — no identity result after 12 s, starting timer');
      doStartTimer();
    }
  }, 12000);
  return () => clearTimeout(fallback);
}, [timerStarted]);

const progressPct = dur === 0 ? 100 : ((dur - secondsLeft) / dur) * 100;

// FIX 2: Descriptive status badge labels (before and after action)
const statusBadgeBefore = {
  like:      '👍 Like the video',
  subscribe: '🔔 Subscribe to channel',
  comment:   '💬 Write a comment',
}[actionType] ?? '';
const statusBadgeAfter = {
  like:      'Detected - tap Return to verify',
  subscribe: 'Detected - tap Return to verify',
  comment:   'Detected - tap Return to verify',
}[actionType] ?? '';

// FIX 1: Action-specific toast message when gray button is tapped
const incompleteToast = {
  like:      'Please like the video first',
  subscribe: 'Please subscribe to the channel first',
  comment:   'Please write and submit a comment first',
}[actionType] ?? 'Please complete the action first';

const autoplayScript = `
    (function() {
      var v = document.querySelector('video');
      if (v) {
        v.autoplay = true;
        if (v.paused) v.play().catch(function() {});
      }
    })();
  `;

// FIX 3: Comment banner — shows immediately on timer end, hides once comment detected
const commentBanner = timerDone && actionType === 'comment' && !actionCompleted ? (
  <View style={s.commentBanner} pointerEvents="none">
    <Text style={s.commentBannerTxt}>
      ✍️ Write a comment below and tap submit to earn coins
    </Text>
  </View>
) : null;

// [Session] Logout WebView REMOVED — was clearing cookies on every task mount.
// Cookies are now preserved across tasks. Clearing only happens when:
//   (a) the user explicitly signs out of the app, OR
//   (b) ytSessionOwner is set AND differs from the current app email.

return (
  <View style={s.container}>
    <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

    {/* WebView Wrapper */}
    <View style={[{ flex: 1, paddingTop: insets.top }]}>
      <WebView
        ref={webViewRef}
        source={{ uri: task.videoUrl + (task.videoUrl.includes('?') ? '&' : '?') + 'autoplay=1' }}
        style={s.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={true}
        injectedJavaScript={LOGIN_CHECK_SCRIPT + '\n' + autoplayScript}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        mixedContentMode="always"
        onMessage={handleWebViewMessage}
        onLoadEnd={() => webViewRef.current?.injectJavaScript(autoplayScript)}
        onNavigationStateChange={(navState) => {
          const url = navState.url;
          const match = url?.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
          const navVideoId = match ? match[1] : null;
          
          console.log(`[Nav] url: ${url}`);
          console.log(`[Nav] extracted: ${navVideoId} | task videoId: ${taskVideoId}`);

          // [Session] DO NOT save ytSessionOwner just because we returned to m.youtube.com.
          // Owner is saved only after IDENTITY_RESULT { match: true }.

          // If we returned to m.youtube.com after the fix flow, re-run identity check
          if (url && url.includes('m.youtube.com') && !url.includes('accounts.google.com') && fixingAccount) {
            console.log('[Identity] Returned to m.youtube.com after fix — re-running identity check');
            setFixingAccount(false);
            setIdentityMatch(null);
            setIdentityChecked(false);
            startTimerOnce.current = false;
            setTimeout(() => {
              const handleForCheck = appHandle || userEmail || '';
              const identScript = buildIdentityCheckScript(handleForCheck)
                .replace('__HANDLE_PLACEHOLDER__', (handleForCheck).toLowerCase().replace(/^@/, ''));
              webViewRef.current?.injectJavaScript(identScript);
            }, 3000);
          }
          
          if (navVideoId) latestWebViewVideoIdRef.current = navVideoId;

          if (navVideoId && taskVideoId && navVideoId !== taskVideoId) {
            if (actionType !== 'watch' && actionType !== 'subscribe') {
              showToast('Please stay on the task video', 4000);
              webViewRef.current?.goBack();
            }
          }
        }}
      />

      {/* FIX 1: React Native touch blocker — replaces LOCK_SCRIPT / UNLOCK_SCRIPT */}
      {/* Visible only while timer is running. Disappears automatically when timerDone=true. */}
      {!timerDone && timerStarted && (
        <View
          style={s.rnTouchBlocker}
          pointerEvents="box-only"
        />
      )}

      {/* Pre-timer UI overlays inside the webview area */}
      {!timerDone && (
        <>
          <TouchableOpacity onPress={() => onReturnToApp({ success: false })} style={s.backBtn}>
            <Text style={s.backBtnTxt}>✕</Text>
          </TouchableOpacity>
          {/* ── IDENTITY MISMATCH OVERLAY (Fix #3) ───────────────────────── */}
          {identityMatch === false && !fixingAccount && (
            <View style={[StyleSheet.absoluteFill, s.identityOverlay]}>
              <Text style={s.identityOverlayTitle}>Account Mismatch</Text>
              <Text style={s.identityOverlayBody}>
                {'YouTube is signed in as '}
                <Text style={s.identityHandleHighlight}>
                  {activeHandle ? (activeHandle.startsWith('@') ? activeHandle : `@${activeHandle}`) : 'another account'}
                </Text>
                {', but TubeRise is signed in as '}
                <Text style={s.identityHandleHighlight}>{appHandle || userEmail || ''}</Text>
                {'.\n\nTap Fix to switch to the correct account.'}
              </Text>
              <TouchableOpacity
                style={s.identityFixBtn}
                onPress={() => {
                  setFixingAccount(true);
                  const logoutUrl = 'https://accounts.google.com/Logout?continue=https%3A%2F%2Faccounts.google.com%2FServiceLogin%3Fservice%3Dyoutube%26continue%3Dhttps%3A%2F%2Fm.youtube.com';
                  webViewRef.current?.injectJavaScript(
                    `window.location.href = ${JSON.stringify(logoutUrl)}; true;`
                  );
                }}
              >
                <Text style={s.identityFixBtnTxt}>Fix</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.identityCancelBtn}
                onPress={() => onReturnToApp({ success: false })}
              >
                <Text style={s.identityCancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Fixing account — show guidance so user knows what to do */}
          {fixingAccount && (
            <View style={[StyleSheet.absoluteFill, s.identityOverlay]}>
              <Text style={s.identityOverlayTitle}>Signing out…</Text>
              <Text style={s.identityOverlayBody}>
                {'Please sign in to YouTube with\n'}
                <Text style={s.identityHandleHighlight}>{appHandle || userEmail || ''}</Text>
              </Text>
            </View>
          )}
        </>
      )}

      {/* Post-timer UI overlays inside the webview area */}
      {timerDone && (
        <>
          <TouchableOpacity onPress={() => onReturnToApp({ success: false })} style={s.backBtn}>
            <Text style={s.backBtnTxt}>✕</Text>
          </TouchableOpacity>

          {/* FIX 3: Comment instruction banner — shows until comment detected */}
          {commentBanner}
        </>
      )}
    </View>

    {/* Post-timer return pill (Root level, so bottom: barHeight + 8 works relative to screen bottom) */}
    {timerDone && (
      <>
        {/* FIX 4: Watch task — green Return button immediately, no action badge */}
        {actionType === 'watch' ? (
          <View style={[s.returnPill, { bottom: barHeight + 8 }]} pointerEvents="box-none">
            <TouchableOpacity
              style={[s.returnBtn, s.returnBtnActive]}
              onPress={() => onReturnToApp({ success: true, actionVerified: true, webViewVideoId: latestWebViewVideoIdRef.current, timerStartedAt: timerStartedAtRef.current })}
            >
              <Text style={s.returnBtnTxt}>Return to App</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.returnPill, { bottom: barHeight + 8 }]} pointerEvents="box-none">
            {/* FIX 2: Descriptive status badge */}
            <View style={[s.statusBadge, actionCompleted && s.statusBadgeDone]}>
              <Text style={s.statusBadgeTxt}>
                {actionCompleted ? statusBadgeAfter : statusBadgeBefore}
              </Text>
            </View>
            {/* FIX 1: Gray button with action-specific toast / green when done */}
            <TouchableOpacity
              style={[s.returnBtn, actionCompleted ? s.returnBtnActive : s.returnBtnGray]}
              onPress={() => {
                if (actionCompleted) {
                  onReturnToApp({ success: true, actionVerified: true, webViewVideoId: latestWebViewVideoIdRef.current, timerStartedAt: timerStartedAtRef.current });
                } else {
                  showToast(incompleteToast, 4000);
                }
              }}
            >
              <Text style={s.returnBtnTxt}>Return to App</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    )}

    {/* Bottom Bar UI */}
    <View 
      style={[s.bottomBar, { paddingBottom: insets.bottom }]}
      onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
    >
        {/* Left — Coins */}
        <View style={s.bottomCol}>
          <View style={s.circleBtn}>
            <Ionicons name="logo-usd" size={24} color={Colors.gold} />
          </View>
          <View style={s.bottomTextGroup}>
            <Text style={s.bottomPrimaryTxt}>{task.coinsReward}</Text>
            <Text style={s.bottomSecondaryTxt}>Coins</Text>
          </View>
        </View>

        {/* Center — Sound */}
        <TouchableOpacity
          style={[s.circleBtn, s.centerBtn]}
          onPress={() => {
            webViewRef.current?.injectJavaScript(`
              (function() {
                var v = document.querySelector('video');
                if (v) {
                  v.muted = !v.muted;
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MUTE_STATE', muted: v.muted }));
                }
              })();
              true;
            `);
          }}
        >
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={26} color={Colors.textPrimary} />
        </TouchableOpacity>

        {/* Right — Seconds */}
        <View style={[s.bottomCol, { alignItems: 'flex-end', justifyContent: 'flex-end' }]}>
          <View style={[s.bottomTextGroup, { alignItems: 'flex-end', marginRight: 8 }]}>
            <Text style={[s.bottomPrimaryTxt, secondsLeft === 0 && { color: Colors.success }]}>
              {!timerStarted ? dur : secondsLeft}
            </Text>
            <Text style={s.bottomSecondaryTxt}>Seconds</Text>
          </View>
          <View style={s.circleBtn}>
            <Ionicons name="time" size={24} color={Colors.primary} />
          </View>
        </View>
      </View>

      <ToastPill message={toastMessage} visible={toastVisible} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    zIndex: 1002, backgroundColor: 'rgba(0,0,0,0.55)',
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnTxt: { color: '#FFF', fontSize: 18, fontWeight: 'bold', lineHeight: 20 },

  // FIX 1: React Native touch blocker — replaces LOCK_SCRIPT / UNLOCK_SCRIPT
  rnTouchBlocker: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
    backgroundColor: 'transparent',
  },

  // FIX 3: Comment instruction banner
  commentBanner: {
    position: 'absolute',
    top: 60, left: 16, right: 16,
    backgroundColor: 'rgba(51, 102, 255, 0.92)',
    borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    zIndex: 1002,
    shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 10,
  },
  commentBannerTxt: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '700',
    textAlign: 'center', lineHeight: 20,
  },

  // ── Bottom Bar UI ────────────────────────────────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F2',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  bottomCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  centerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: 16,
  },
  bottomTextGroup: {
    marginLeft: 8,
  },
  bottomPrimaryTxt: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#121212',
    lineHeight: 26,
  },
  bottomSecondaryTxt: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 16,
  },

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
  statusBadgeTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  returnBtn: {
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 24, elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.25,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  returnBtnActive: { backgroundColor: '#10B981' },
  returnBtnGray: { backgroundColor: '#6B7280' },
  returnBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  // ── Sign-in banner (only shown after all retries fail) ────────────────────
  ytLoginBanner: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
    paddingVertical: 14, paddingHorizontal: 16,
    zIndex: 1001, alignItems: 'center',
  },
  ytLoginBannerTxt: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  ytLoginEmailTxt: { color: '#FFD700', fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  ytLoginSubTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center', marginTop: 2 },

  // ── Signed-in email pill ──────────────────────────────────────────────────
  accountPill: {
    position: 'absolute', top: 8, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, zIndex: 1001,
  },
  accountPillTxt: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // ── FIX 3: Account mismatch warning banner (legacy — kept for reference) ──
  mismatchBanner: {
    position: 'absolute',
    top: 60,
    left: 12, right: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
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

  // ── Identity mismatch overlay (Fix #2/#3) ─────────────────────────────────
  identityOverlay: {
    backgroundColor: 'rgba(0,0,0,0.92)',
    zIndex: 1010,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  identityOverlayTitle: {
    color: '#FF4444',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  identityOverlayBody: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  identityHandleHighlight: {
    color: '#FFD700',
    fontWeight: '700',
  },
  identityFixBtn: {
    backgroundColor: '#FF0000',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  identityFixBtnTxt: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  identityCancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  identityCancelBtnTxt: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    fontSize: 15,
  },
});




