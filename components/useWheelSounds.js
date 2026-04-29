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

  /**
   * Play a single short tick — modelled after a mechanical clock escapement:
   *   • a band-pass-filtered noise burst gives the sharp "snap" transient
   *   • a brief triangle-wave body (~1.6–2 kHz) gives the resonant "tock"
   * Both decay in ~25 ms so consecutive ticks stay crisp at high spin speeds.
   */
  const playTick = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      // 1. Noise burst — the percussive "click"
      const noiseBuffer = ctx.createBuffer(1, 256, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 3500;
      noiseFilter.Q.value = 1.2;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.03);

      // 2. Tonal body — gives the tick its pitched "tock" character
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "triangle";
      // Tiny pitch jitter avoids a metronome feel on long spins
      osc.frequency.setValueAtTime(1700 + Math.random() * 300, now);
      oscGain.gain.setValueAtTime(0.06, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
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
