"""ruNit Direct — music bed, sound cues and narration mix (all original, synthesized here).
Usage: python3 trailer/direct/mix.py   ->  trailer/direct/out/mix.wav
"""
import json, subprocess, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).parent
TL = json.load(open(HERE / "timeline.json"))
S = {s["id"]: s for s in TL["segments"]}
SR = 48000
DUR = TL["duration"] + 0.5
N = int(SR * DUR)
music = np.zeros((N, 2)); fx = np.zeros((N, 2)); vo = np.zeros(N)
rng = np.random.default_rng(7)

def place(buf, sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(buf) or i < 0: return
    sig = sig[: len(buf) - i] * gain
    if buf.ndim == 2:
        buf[i:i + len(sig), 0] += sig * (1 - max(0, pan)); buf[i:i + len(sig), 1] += sig * (1 + min(0, pan))
    else:
        buf[i:i + len(sig)] += sig

def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def onepole(x, cutoff):
    a = np.broadcast_to(np.exp(-2 * np.pi * np.asarray(cutoff, dtype=float) / SR), x.shape); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a[i]) * x[i] + a[i] * acc; y[i] = acc
    return y

def noise_band(n, lo, hi):
    x = rng.standard_normal(n); return onepole(x, hi) - onepole(x, lo)

# ---------- instruments ----------
def pluck(f, d=0.6, bright=0.35):
    n = int(d * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + bright * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 9) + 0.12 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 14)
    return s * env(n, 0.003, d * 0.28)

def pad(freqs, d, g=0.05):
    n = int(d * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for f in freqs:
        for det in (-0.5, 0.0, 0.6):
            ph = rng.random() * 6.28; s += np.sin(2 * np.pi * (f + det) * t + ph)
    fade = np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 0.8)
    return s * fade * g / len(freqs)

def kick():
    n = int(0.3 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(55 + 70 * np.exp(-t * 35)) / SR) * env(n, 0.001, 0.12) * 0.8

def snap():
    n = int(0.12 * SR); return noise_band(n, 1800, 7000) * env(n, 0.0005, 0.025) * 0.5

def shaker():
    n = int(0.07 * SR); return noise_band(n, 6000, 13000) * env(n, 0.004, 0.02) * 0.22

def bass(f, d):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * env(n, 0.006, d * 0.5) * 0.35

# ---------- cues ----------
def chime():  # bright two-note bell for segment cards
    out = np.zeros(int(1.4 * SR))
    for k, (f, t0) in enumerate([(1318.5, 0.0), (1975.5, 0.11)]):
        n = int(1.2 * SR); t = np.arange(n) / SR
        b = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 12)) * env(n, 0.002, 0.35)
        i = int(t0 * SR); out[i:i + n] += b[: len(out) - i] * (0.6 if k == 0 else 0.5)
    return out * 0.45

def whoosh(d=0.5, rise=True):
    n = int(d * SR); t = np.arange(n) / SR
    x = noise_band(n, 300, 5000) * np.sin(np.pi * t / d) ** 2
    return x * 0.5

def tick():
    n = int(0.06 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2200 * t) * env(n, 0.0005, 0.01) * 0.35

def bounce():
    n = int(0.35 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(55 + 110 * np.exp(-t * 9)) / SR) * env(n, 0.001, 0.09)
    slap = noise_band(n, 900, 4000) * env(n, 0.0005, 0.012) * 0.6
    return (body + slap) * 0.9

def swish():
    n = int(0.6 * SR); t = np.arange(n) / SR
    return noise_band(n, 2500, 9000) * np.sin(np.pi * np.minimum(1, t / 0.45)) ** 2 * 0.45

def hit():
    n = int(1.8 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (45 + 25 * np.exp(-t * 6)) * t) * env(n, 0.002, 0.6) + noise_band(n, 300, 5000) * env(n, 0.002, 0.2) * 0.3) * 0.7

def riser(d):
    n = int(d * SR); t = np.arange(n) / SR
    return noise_band(n, 400, 2500 + 7000 * (t / d) ** 2) * (t / d) ** 2.2 * 0.35

def sparkle():
    out = np.zeros(int(1.6 * SR))
    for k, f in enumerate([1568, 1976, 2349, 3136]):
        n = int(1.2 * SR); t = np.arange(n) / SR
        b = np.sin(2 * np.pi * f * t) * env(n, 0.002, 0.25); i = int(k * 0.07 * SR); out[i:i + n] += b[: len(out) - i] * 0.25
    return out

# ---------- music: D  Bm  G  A, 98 bpm, bright plucks ----------
BPM = 98; beat = 60 / BPM; bar = 4 * beat
CH = [[293.7, 370.0, 440.0, 554.4], [246.9, 293.7, 370.0, 440.0], [196.0, 246.9, 293.7, 370.0], [220.0, 277.2, 329.6, 440.0]]
ROOT = [73.4, 61.7, 49.0, 55.0]
PATTERN = [0, 2, 1, 3, 2, 1, 3, 2]  # arpeggio over 8th notes
music_start = S["intro"]["start"] - 0.3
silence = (S["more"]["cardStart"], S["more"]["shotStart"] + 3.0)  # "one more thing" hush
music_end = S["close"]["start"] + 0.2
k = 0
while music_start + k * bar < music_end:
    t0 = music_start + k * bar; ci = k % 4
    if not (silence[0] - bar < t0 < silence[1]):
        place(music, pad(CH[ci], bar + 0.9, 0.05), t0)
        for e in range(8):
            te = t0 + e * beat / 2
            if silence[0] <= te < silence[1] or te >= music_end: continue
            f = CH[ci][PATTERN[e]] * (2 if e in (3, 6) else 1)
            place(music, pluck(f), te, 0.22, -0.25 + 0.5 * (e % 2))
            place(music, shaker(), te, 0.9 if e % 2 else 0.6, 0.4)
        for b in range(4):
            tb = t0 + b * beat
            if silence[0] <= tb < silence[1] or tb >= music_end: continue
            place(music, bass(ROOT[ci], beat * 0.9), tb, 1.0 if b in (0, 2) else 0.6)
            if b in (0, 2) and t0 > S["find"]["start"]: place(music, kick(), tb, 0.8)
            if b in (1, 3) and t0 > S["find"]["start"]: place(music, snap(), tb, 0.9, 0.15)
    k += 1
# globe swell after the hush, and the closing chord
place(music, pad([146.8, 220.0, 293.7, 370.0, 440.0], 6.0, 0.09), silence[1] - 1.0)
place(music, pad([146.8, 220.0, 293.7, 370.0, 554.4], TL["duration"] - S["close"]["start"] + 0.3, 0.1), S["close"]["start"])

# ---------- cues on the timeline ----------
for t in [0.95, 1.6, 2.08]: place(fx, bounce(), t, 1.0, -0.1)
place(fx, sparkle(), 2.6, 0.9)
for s in TL["segments"]:
    if "cardStart" in s:
        place(fx, whoosh(0.45), s["cardStart"] - 0.05, 0.8)
        if s["id"] != "more": place(fx, chime(), s["cardStart"] + 0.18)
        place(fx, whoosh(0.4), s["cardStart"] + 1.42, 0.5)
def shot_d(s): return s["end"] - s["shotStart"]
for sid, fracs in {"find": [0.38], "call": [0.0, 0.45], "prove": [0.36, 0.66], "know": [0.0, 0.55], "stamp": [0.5]}.items():
    for f in fracs: place(fx, tick(), S[sid]["shotStart"] + shot_d(S[sid]) * f + 0.05, 1.0)
more = S["more"]
place(fx, hit(), more["cardStart"] + 0.2, 0.35)
fly_start = more["shotStart"] + shot_d(more) * (100 / 250)
place(fx, riser(2.2), fly_start - 0.4, 1.0)
place(fx, sparkle(), more["shotStart"] + shot_d(more) * (205 / 250), 1.0)
place(fx, hit(), S["close"]["start"] + 0.1, 0.6)
place(fx, swish(), S["close"]["start"] + 0.7, 0.9)

# ---------- narration ----------
for s in TL["segments"]:
    if "voStart" not in s: continue
    src = HERE / "vo" / f"{s['id']}.wav"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-ar", str(SR), "-ac", "1", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(float) / 32768
    x = x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 0.11  # same loudness for every line
    place(vo, x, s["voStart"])

# duck music under the voice
active = np.abs(vo) > 0.004
win = int(0.25 * SR)
act = np.convolve(active.astype(float), np.ones(win) / win, mode="same") > 0.02
duck = onepole(np.where(act, 0.42, 1.0), 6.0)
def lv(name, x):
    x = np.asarray(x); print(f"  {name:6} rms {20*np.log10(np.sqrt(np.mean(x**2))+1e-9):6.1f} dB  peak {20*np.log10(np.max(np.abs(x))+1e-9):6.1f} dB")
lv("music", music); lv("fx", fx); lv("vo", vo)
mix = music * 0.55 * duck[:, None] + fx * 0.8 + vo[:, None] * 1.0
lv("pre", mix)
fade = np.ones(N); fl = int(1.2 * SR); fade[-fl:] = np.linspace(1, 0, fl)
mix *= fade[:, None]
mix *= 0.5                                   # headroom; final loudness is set by loudnorm at encode
peak = np.max(np.abs(mix))
mix = np.where(np.abs(mix) > 0.7, np.sign(mix) * (0.7 + 0.25 * np.tanh((np.abs(mix) - 0.7) / 0.25)), mix)  # soft knee above -3 dB
lv("post", mix)
out = HERE / "out" / "mix.wav"; out.parent.mkdir(exist_ok=True)
with wave.open(str(out), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("wrote", out, f"{DUR:.1f}s")
