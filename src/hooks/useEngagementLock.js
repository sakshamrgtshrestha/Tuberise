/**
 * useEngagementLock — v3
 *
 * "Proof of Time" enforcement hook for TubeRise Task-Validation Engine.
 *
 * New in v3:
 *  - earlyReturnCount: tracks consecutive early returns per task
 *  - lockedUntil: timestamp; if Date.now() < lockedUntil → task locked 5 min
 *  - isCooldown / cooldownValue: 30-second post-success cooldown phase
 *  - startCooldown(): begins the 30s cooldown, fires onCooldownComplete at 0
 *  - isLocked computed: true when lockedUntil > Date.now()
 *
 * Returned shape:
 *  { timerValue, timerDone, hasOpenedYouTube, returnedEarly, interactionValid,
 *    openYouTube, dismissEarlyReturn, giveUp, canClaim, minSeconds, countdownStart,
 *    earlyReturnCount, isLocked, lockedUntil, isCooldown, cooldownValue, startCooldown }
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { AppState, Linking } from 'react-native';

/** Hard-minimum required time on YouTube per task type (seconds) */
export const TASK_MIN_SECONDS = {
  watch:     0,   // watch tasks use campaign-defined watchTimeRequired
  subscribe: 30,
  like:      20,
  comment:   45,
};

function getMinSeconds(actionType, totalSeconds) {
  if (actionType === 'watch') return totalSeconds;
  return TASK_MIN_SECONDS[actionType] ?? 30;
}

const COOLDOWN_DURATION = 30; // seconds
const LOCK_DURATION_MS  = 5 * 60 * 1000; // 5 minutes

export function useEngagementLock({
  totalSeconds,       // countdown duration (watch = campaign value, others = min)
  actionType,         // 'watch' | 'subscribe' | 'like' | 'comment'
  videoUrl,
  onGiveUp,
  onTimerComplete,    // fired when countdown hits zero (for auto-advance)
  onCooldownComplete, // fired when 30s cooldown ends
}) {
  const minSeconds = getMinSeconds(actionType, totalSeconds);
  const countdownStart = actionType === 'watch' ? totalSeconds : minSeconds;

  // ── Core timer state ─────────────────────────────────────────────────────
  const [timerValue, setTimerValue]           = useState(countdownStart);
  const [timerDone, setTimerDone]             = useState(countdownStart <= 0);
  const [hasOpenedYouTube, setHasOpenedYouTube] = useState(false);
  const [returnedEarly, setReturnedEarly]     = useState(false);
  const [interactionValid, setInteractionValid] = useState(false);

  // ── Cheat detection state ─────────────────────────────────────────────────
  const [earlyReturnCount, setEarlyReturnCount] = useState(0);
  const [lockedUntil, setLockedUntil]           = useState(null); // timestamp ms or null
  const earlyReturnCountRef = useRef(0);

  // ── Cooldown state ────────────────────────────────────────────────────────
  const [isCooldown, setIsCooldown]       = useState(false);
  const [cooldownValue, setCooldownValue] = useState(COOLDOWN_DURATION);
  const cooldownIntervalRef               = useRef(null);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const intervalRef        = useRef(null);
  const appStateRef        = useRef(AppState.currentState);
  const startTimestampRef  = useRef(null);
  const timerValueRef      = useRef(countdownStart);
  const timerDoneRef       = useRef(countdownStart <= 0);
  const currentUrlRef      = useRef(videoUrl);
  const onCompleteRef      = useRef(onTimerComplete);
  const onCooldownDoneRef  = useRef(onCooldownComplete);

  useEffect(() => { onCompleteRef.current = onTimerComplete; }, [onTimerComplete]);
  useEffect(() => { onCooldownDoneRef.current = onCooldownComplete; }, [onCooldownComplete]);
  useEffect(() => { timerValueRef.current = timerValue; }, [timerValue]);
  useEffect(() => { timerDoneRef.current = timerDone; }, [timerDone]);
  useEffect(() => { currentUrlRef.current = videoUrl; }, [videoUrl]);

  // Computed
  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  // ── Countdown control ─────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    if (intervalRef.current) return;
    if (timerDoneRef.current) return;

    intervalRef.current = setInterval(() => {
      setTimerValue(prev => {
        const next = prev - 1;
        timerValueRef.current = next;
        if (next <= 0) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          timerDoneRef.current = true;
          setTimerDone(true);
          onCompleteRef.current && onCompleteRef.current();
          return 0;
        }
        return next;
      });
    }, 1000);
  }, []);

  const pauseCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    pauseCountdown();
    setTimerValue(countdownStart);
    setTimerDone(false);
    timerValueRef.current = countdownStart;
    timerDoneRef.current = false;
    setInteractionValid(false);
  }, [pauseCountdown, countdownStart]);

  // ── Cooldown control ──────────────────────────────────────────────────────
  const startCooldown = useCallback(() => {
    if (cooldownIntervalRef.current) return;
    setIsCooldown(true);
    setCooldownValue(COOLDOWN_DURATION);

    let remaining = COOLDOWN_DURATION;
    cooldownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setCooldownValue(remaining);
      if (remaining <= 0) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
        setIsCooldown(false);
        onCooldownDoneRef.current && onCooldownDoneRef.current();
      }
    }, 1000);
  }, []);

  const stopCooldown = useCallback(() => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
    setIsCooldown(false);
    setCooldownValue(COOLDOWN_DURATION);
  }, []);

  // ── AppState listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      // User LEFT the app → start countdown
      if (hasOpenedYouTube && nextState === 'background') {
        startCountdown();
      }

      // User RETURNED to the app
      if (
        hasOpenedYouTube &&
        (prevState === 'background' || prevState === 'inactive') &&
        nextState === 'active'
      ) {
        pauseCountdown();

        const elapsed = startTimestampRef.current
          ? (Date.now() - startTimestampRef.current) / 1000
          : 0;

        if (elapsed >= minSeconds) {
          setInteractionValid(true);
          setTimerDone(true);
          timerDoneRef.current = true;
          setTimerValue(0);
          timerValueRef.current = 0;
          onCompleteRef.current && onCompleteRef.current();
        } else if (!timerDoneRef.current) {
          // Returned EARLY — cheat detection
          const newCount = earlyReturnCountRef.current + 1;
          earlyReturnCountRef.current = newCount;
          setEarlyReturnCount(newCount);

          if (newCount >= 2) {
            // Lock task for 5 minutes
            const lockTs = Date.now() + LOCK_DURATION_MS;
            setLockedUntil(lockTs);
          }

          setReturnedEarly(true);
          resetTimer();
        }
        // If timerDone, validation will be handled by the component
        // (it watches timerDone + AppState active via the hook return values)
      }
    });

    return () => {
      subscription.remove();
      pauseCountdown();
    };
  }, [hasOpenedYouTube, minSeconds, startCountdown, pauseCountdown, resetTimer]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const openYouTube = useCallback(async (url, isAutoPilot = false) => {
    const target = url || currentUrlRef.current;
    if (!target) return;

    // Reset for fresh attempt
    pauseCountdown();
    stopCooldown();
    startTimestampRef.current = Date.now();
    setHasOpenedYouTube(true);
    setReturnedEarly(false);
    setInteractionValid(false);
    setTimerValue(countdownStart);
    setTimerDone(false);
    timerValueRef.current = countdownStart;
    timerDoneRef.current = false;
    // Don't reset early return count — persists per task

    if (isAutoPilot) {
      startCountdown();
    } else {
      startCountdown();
    }
  }, [pauseCountdown, stopCooldown, countdownStart, startCountdown]);

  const dismissEarlyReturn = useCallback(async (isAutoPilot = false) => {
    setReturnedEarly(false);
    startTimestampRef.current = Date.now();
    if (isAutoPilot) {
      startCountdown();
    } else {
      startCountdown();
    }
  }, [startCountdown]);

  const giveUp = useCallback(() => {
    pauseCountdown();
    stopCooldown();
    onGiveUp && onGiveUp();
  }, [pauseCountdown, stopCooldown, onGiveUp]);

  const triggerEarlyReturn = useCallback(() => {
    pauseCountdown();
    const newCount = earlyReturnCountRef.current + 1;
    earlyReturnCountRef.current = newCount;
    setEarlyReturnCount(newCount);

    if (newCount >= 2) {
      const lockTs = Date.now() + LOCK_DURATION_MS;
      setLockedUntil(lockTs);
    }
    setReturnedEarly(true);
    resetTimer();
  }, [pauseCountdown, resetTimer]);

  /** Reset for a brand new task (called when advancing to next task) */
  const resetForNewTask = useCallback(() => {
    pauseCountdown();
    stopCooldown();
    earlyReturnCountRef.current = 0;
    setEarlyReturnCount(0);
    setLockedUntil(null);
    setHasOpenedYouTube(false);
    setReturnedEarly(false);
    setInteractionValid(false);
    setTimerValue(countdownStart);
    setTimerDone(false);
    timerValueRef.current = countdownStart;
    timerDoneRef.current = false;
    startTimestampRef.current = null;
  }, [pauseCountdown, stopCooldown, countdownStart]);

  // Cleanup on unmount
  useEffect(() => () => {
    pauseCountdown();
    stopCooldown();
  }, [pauseCountdown, stopCooldown]);

  const canClaim = timerDone && interactionValid;

  return {
    timerValue,
    timerDone,
    hasOpenedYouTube,
    returnedEarly,
    interactionValid,
    openYouTube,
    dismissEarlyReturn,
    giveUp,
    canClaim,
    minSeconds,
    countdownStart,
    // v3 additions
    earlyReturnCount,
    isLocked,
    lockedUntil,
    isCooldown,
    cooldownValue,
    startCooldown,
    resetForNewTask,
    triggerEarlyReturn,
  };
}
