"use client";
import { useRef, useCallback } from "react";

/**
 * Generates tick-tick and victory sounds purely via Web Audio API.
 * No external sound files needed.
 */
export function useWheelSounds(muted = false) {
  const ctxRef = useRef(null);
  const tickIntervalRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  };

  /** Play a single short tick sound */
  const playTick = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Silently ignore audio errors
    }
  }, [muted]);

  /** Start a tick loop that gradually slows down (simulating deceleration) */
  const startTicking = useCallback(
    (durationMs = 5000) => {
      if (muted) return;
      stopTicking();

      const startTime = Date.now();
      let interval = 50; // fast initial tick

      const tick = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= durationMs) {
          stopTicking();
          return;
        }

        playTick();

        // Gradually slow down: interval increases as we approach the end
        const progress = elapsed / durationMs;
        interval = 50 + progress * 250; // 50ms → ~300ms
        tickIntervalRef.current = setTimeout(tick, interval);
      };

      tick();
    },
    [muted, playTick]
  );

  /** Stop the tick loop */
  const stopTicking = useCallback(() => {
    if (tickIntervalRef.current) {
      clearTimeout(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  /** Play a triumphant victory fanfare */
  const playVictory = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getCtx();

      // Short ascending arpeggio: C5 → E5 → G5 → C6
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + i * 0.12 + 0.3
        );

        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    } catch {
      // Silently ignore audio errors
    }
  }, [muted]);

  return { playTick, startTicking, stopTicking, playVictory };
}
