/**
 * useAutoPilot — 4-State Auto-Pilot Machine for TubeRise
 *
 * States:
 *   IDLE          → waiting for user to start
 *   ACTIVE_TASK   → task running, AppState timer counting down
 *   AUTO_INTERACT → final 5 seconds — WebView JS injection fires
 *   COOLDOWN      → 30-second mandatory wait between tasks
 *   REPEAT        → fetch next task, auto-start (when autoPilot=true)
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, Linking } from 'react-native';

export const PILOT_STATE = {
  IDLE:          'IDLE',
  ACTIVE_TASK:   'ACTIVE_TASK',
  AUTO_INTERACT: 'AUTO_INTERACT',
  COOLDOWN:      'COOLDOWN',
  REPEAT:        'REPEAT',
};

export const TASK_MIN_SECONDS = {
  watch:     87,   // overridden by campaign value
  subscribe: 30,
  like:      20,
  comment:   45,
};

const AUTO_INTERACT_THRESHOLD = 5; // seconds remaining when JS injection fires
const COOLDOWN_SECONDS = 30;

export function useAutoPilot({
  task,
  actionType,
  autoPilot = false,
  onTaskComplete,     // ({ coinsEarned }) called when timer finishes + valid
  onCooldownEnd,      // called when 30s cooldown ends
  onReturnedEarly,    // called when user returns before timer done
}) {
  const duration = actionType === 'watch'
    ? (task?.watchTimeRequired ?? TASK_MIN_SECONDS.watch)
    : TASK_MIN_SECONDS[actionType] ?? 30;

  const [pilotState,    setPilotState]    = useState(PILOT_STATE.IDLE);
  const [timerValue,    setTimerValue]    = useState(duration);
  const [cooldownValue, setCooldownValue] = useState(COOLDOWN_SECONDS);
  const [returnedEarly, setReturnedEarly] = useState(false);
  const [taskDone,      setTaskDone]      = useState(false);

  const taskTimerRef    = useRef(null);
  const coolTimerRef    = useRef(null);
  const appStateRef     = useRef(AppState.currentState);
  const startTimeRef    = useRef(null);
  const hasStartedRef   = useRef(false);
  const pilotStateRef   = useRef(PILOT_STATE.IDLE);
  const timerValueRef   = useRef(duration);
  const autoPilotRef    = useRef(autoPilot);

  useEffect(() => { autoPilotRef.current = autoPilot; }, [autoPilot]);
  useEffect(() => { pilotStateRef.current = pilotState; }, [pilotState]);
  useEffect(() => { timerValueRef.current = timerValue; }, [timerValue]);

  // ── Internal helpers ──────────────────────────────────────────────────────

  const clearTaskTimer = useCallback(() => {
    if (taskTimerRef.current) { clearInterval(taskTimerRef.current); taskTimerRef.current = null; }
  }, []);

  const clearCoolTimer = useCallback(() => {
    if (coolTimerRef.current) { clearInterval(coolTimerRef.current); coolTimerRef.current = null; }
  }, []);

  // ── Cooldown (30s mandatory wait) ─────────────────────────────────────────

  const startCooldown = useCallback(() => {
    clearTaskTimer();
    setPilotState(PILOT_STATE.COOLDOWN);
    pilotStateRef.current = PILOT_STATE.COOLDOWN;
    setCooldownValue(COOLDOWN_SECONDS);

    let remaining = COOLDOWN_SECONDS;
    coolTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCooldownValue(remaining);
      if (remaining <= 0) {
        clearInterval(coolTimerRef.current);
        coolTimerRef.current = null;
        setPilotState(PILOT_STATE.REPEAT);
        onCooldownEnd?.();
      }
    }, 1000);
  }, [clearTaskTimer, onCooldownEnd]);

  // ── Task timer (ticks down from `duration`) ───────────────────────────────

  const startTaskTimer = useCallback(() => {
    clearTaskTimer();
    let remaining = duration;
    setTimerValue(remaining);
    setTaskDone(false);

    taskTimerRef.current = setInterval(() => {
      remaining -= 1;
      timerValueRef.current = remaining;
      setTimerValue(remaining);

      // Enter AUTO_INTERACT phase in final 5 seconds
      if (remaining <= AUTO_INTERACT_THRESHOLD && remaining > 0) {
        if (pilotStateRef.current === PILOT_STATE.ACTIVE_TASK) {
          setPilotState(PILOT_STATE.AUTO_INTERACT);
          pilotStateRef.current = PILOT_STATE.AUTO_INTERACT;
        }
      }

      if (remaining <= 0) {
        clearInterval(taskTimerRef.current);
        taskTimerRef.current = null;
        setTaskDone(true);
        onTaskComplete?.({ coinsEarned: task?.coinsReward ?? 25 });
        // Auto-Pilot: go straight to cooldown
        if (autoPilotRef.current) {
          startCooldown();
        }
      }
    }, 1000);
  }, [duration, clearTaskTimer, task, onTaskComplete, startCooldown]);

  // ── Open YouTube + start task ─────────────────────────────────────────────

  const startTask = useCallback(async (videoUrl) => {
    const url = videoUrl || task?.videoUrl;
    if (!url) return;

    setReturnedEarly(false);
    setTaskDone(false);
    hasStartedRef.current = true;
    startTimeRef.current = Date.now();
    setPilotState(PILOT_STATE.ACTIVE_TASK);
    pilotStateRef.current = PILOT_STATE.ACTIVE_TASK;

    // Open YouTube external
    try {
      await Linking.openURL(url);
    } catch {
      await Linking.openURL(url.replace('vnd.youtube:', 'https://www.youtube.com/watch?v='));
    }

    // Start countdown immediately (AppState fires when user leaves)
    startTaskTimer();
  }, [task, startTaskTimer]);

  // ── AppState — early return detection ────────────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      // User returned to app
      if (
        hasStartedRef.current &&
        (prev === 'background' || prev === 'inactive') &&
        next === 'active'
      ) {
        const ps = pilotStateRef.current;
        if (ps === PILOT_STATE.ACTIVE_TASK || ps === PILOT_STATE.AUTO_INTERACT) {
          const tv = timerValueRef.current;
          if (tv > 0) {
            // Returned EARLY — reset timer, show modal
            clearTaskTimer();
            setTimerValue(duration);
            timerValueRef.current = duration;
            setReturnedEarly(true);
            setPilotState(PILOT_STATE.ACTIVE_TASK);
            pilotStateRef.current = PILOT_STATE.ACTIVE_TASK;
            onReturnedEarly?.();
          }
        }
      }
    });
    return () => sub.remove();
  }, [duration, clearTaskTimer, onReturnedEarly]);

  // ── Dismiss early-return modal — send back to YouTube ────────────────────

  const dismissEarlyReturn = useCallback(async () => {
    setReturnedEarly(false);
    startTimeRef.current = Date.now();
    const url = task?.videoUrl;
    if (url) {
      try { await Linking.openURL(url); }
      catch { await Linking.openURL(url.replace('vnd.youtube:', 'https://www.youtube.com/watch?v=')); }
    }
    startTaskTimer();
  }, [task, startTaskTimer]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => () => { clearTaskTimer(); clearCoolTimer(); }, [clearTaskTimer, clearCoolTimer]);

  return {
    pilotState,
    timerValue,
    cooldownValue,
    returnedEarly,
    taskDone,
    duration,
    startTask,
    startCooldown,
    dismissEarlyReturn,
    isAutoInteractPhase: pilotState === PILOT_STATE.AUTO_INTERACT,
    canClaim: taskDone && !returnedEarly,
  };
}
