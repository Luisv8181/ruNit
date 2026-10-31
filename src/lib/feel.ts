"use client";
// Small moments of feel: synthesized sounds (no audio files) and haptics.
// Respects reduced motion and a per-device mute setting.

let ctx: AudioContext | null = null;
const muted = () => { try { return localStorage.getItem("runit-sound") === "off"; } catch { return false; } };
export function setSound(on: boolean) { try { localStorage.setItem("runit-sound", on ? "on" : "off"); } catch { /* ignore */ } }
export function soundOn() { return !muted(); }

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) { const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!C) return null; ctx = new C(); }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function haptic(pattern: number | number[] = 12) {
  try { if ("vibrate" in navigator) navigator.vibrate(pattern); } catch { /* unsupported (iOS Safari) */ }
}

function tone(f: number, at: number, dur: number, gain: number, type: OscillatorType = "sine") {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, a.currentTime + at);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur);
  o.connect(g).connect(a.destination); o.start(a.currentTime + at); o.stop(a.currentTime + at + dur + 0.05);
}

function noise(at: number, dur: number, gain: number, lo: number, hi: number) {
  const a = ac(); if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / len) ** 2;
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = (lo + hi) / 2; bp.Q.value = 0.7;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(bp).connect(g).connect(a.destination); src.start(a.currentTime + at);
}

/** Net swish — a confirmed game, a confirmed line. */
export function swish() { haptic([18, 40, 30]); if (!muted()) noise(0, 0.5, 0.5, 3000, 8000); }
/** A score tap. */
export function tick(big = false) { haptic(big ? 16 : 10); if (!muted()) tone(big ? 1320 : 990, 0, 0.08, 0.12, "triangle"); }
/** Two phones meet. */
export function bumpSound() { haptic([25, 60, 25]); if (!muted()) { tone(784, 0, 0.18, 0.15); tone(1175, 0.09, 0.3, 0.13); } }
/** Something needs attention. */
export function nudge() { haptic([40, 50, 40]); if (!muted()) tone(330, 0, 0.18, 0.12, "triangle"); }
