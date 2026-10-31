"""Original trailer soundtrack, synthesized from scratch (no samples, no licensed music).
Usage: python3 trailer/audio.py out.wav [duration_seconds]
Timeline matches trailer/composition.html.
"""
import sys, wave
import numpy as np

SR = 48000
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 72.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(23)

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * (1 - max(0, pan))
    R[i:i + len(sig)] += sig * (1 + min(0, pan))

def env(n, a=0.005, d=0.2):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
    return e

def lowpass(x, cutoff):
    a = np.broadcast_to(np.exp(-2 * np.pi * np.asarray(cutoff, dtype=float) / SR), x.shape)
    y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc; y[i] = acc
    return y

def bandnoise(n, lo, hi):
    x = rng.standard_normal(n)
    return lowpass(x, hi) - lowpass(x, lo)

# --- sound design atoms ---
def ball_bounce():  # basketball on concrete: pitched thump + rubber slap
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 110 * np.exp(-t * 9) + 55
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.09)
    slap = bandnoise(n, 900, 4000) * env(n, 0.0005, 0.012) * 0.6
    ring = np.sin(2 * np.pi * 420 * t) * env(n, 0.001, 0.05) * 0.15
    return (body + slap + ring) * 0.9

def squeak():  # sneaker on hardwood/sport tile
    n = int(0.22 * SR); t = np.arange(n) / SR
    f = 2300 + 900 * np.sin(2 * np.pi * 7 * t) + 1500 * t
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return s * env(n, 0.01, 0.08) * 0.22

def swish():  # net
    n = int(0.6 * SR); t = np.arange(n) / SR
    x = bandnoise(n, 2500, 9000) * np.sin(np.pi * np.minimum(1, t / 0.45)) ** 2
    return x * 0.5

def kick():
    n = int(0.4 * SR); t = np.arange(n) / SR
    f = 120 * np.exp(-t * 30) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.16) * 0.95

def clap():
    n = int(0.25 * SR)
    x = bandnoise(n, 900, 5000)
    e = env(n, 0.001, 0.06) + 0.5 * np.roll(env(n, 0.001, 0.02), int(0.012 * SR))
    return x * e * 0.55

def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    return bandnoise(n, 7000, 14000) * env(n, 0.0005, 0.06 if open_ else 0.015) * 0.35

def impact():
    n = int(1.6 * SR); t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (48 + 30 * np.exp(-t * 6)) * t) * env(n, 0.002, 0.5)
    air = bandnoise(n, 300, 6000) * env(n, 0.002, 0.25) * 0.4
    return (sub + air) * 0.8

def riser(d):
    n = int(d * SR); t = np.arange(n) / SR
    x = bandnoise(n, 400, 3000 + 6000 * t / d) * (t / d) ** 2
    return x * 0.35

def pad(freqs, d, gain=0.06):
    n = int(d * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.6, 0, 0.7):
            ph = rng.random() * 6.28
            s += np.sin(2 * np.pi * (f + det) * t + ph) + 0.25 * np.sin(4 * np.pi * (f + det) * t + ph)
    fade = np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 1.2)
    return s * fade * gain / len(freqs)

def bass(f, d):
    n = int(d * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    return s * env(n, 0.005, d * 0.6) * 0.32

# --- score: warm, hopeful progression (D major-ish: D  Bm  G  A) ---
CH = [[146.8, 185.0, 220.0, 293.7], [123.5, 146.8, 185.0, 246.9], [98.0, 146.8, 196.0, 246.9], [110.0, 138.6, 164.8, 220.0]]
ROOT = [73.4, 61.7, 49.0, 55.0]
BPM = 92; beat = 60 / BPM; bar = 4 * beat

# Cold open 0–7s: ball on concrete, footsteps of sound, squeak, net.
for t in [0.6, 1.45, 2.2, 2.85, 3.4, 3.9, 4.35]:
    add(ball_bounce(), t, 1.0, -0.2)
add(squeak(), 5.0, 1.0, 0.3)
add(swish(), 6.1, 1.0, 0.1)
add(pad(CH[0], 7.5, 0.035), 0.0)
add(riser(1.4), 5.6, 1.0)

# Music 7–64s
t0 = 7.0
k = 0
while t0 + k * bar < 64.0:
    bt = t0 + k * bar
    ci = k % 4
    add(pad(CH[ci], bar + 1.2, 0.07), bt)
    for b in range(4):
        add(bass(ROOT[ci], beat * 0.95), bt + b * beat, 1.0 if b in (0, 2) else 0.6)
    drums = bt >= 15.0
    if drums:
        add(kick(), bt); add(kick(), bt + 2.5 * beat, 0.8); add(kick(), bt + 2 * beat)
        add(clap(), bt + beat); add(clap(), bt + 3 * beat)
        for h in range(8):
            add(hat(h == 7), bt + h * beat / 2, 0.9 if h % 2 else 0.6, 0.35)
    else:
        add(kick(), bt, 0.6)
    k += 1

# Play section 24–34: squeaks + bounces layered on the beat
for t in [24.4, 25.9, 27.3, 28.0, 29.6, 31.2, 32.4]:
    add(squeak(), t, 0.9, rng.uniform(-0.5, 0.5))
for t in np.arange(24.2, 33.8, beat / 2):
    add(ball_bounce(), t, 0.35, -0.1)
add(swish(), 33.4, 1.0)

# Section hits
for t in [7.0, 15.0, 24.0, 34.0, 44.0, 54.0]:
    add(impact(), t, 0.55)
add(riser(2.0), 62.0, 1.2)

# Finale 64–72: beat drops, single bounce, swell, final hit and net
add(pad(CH[2], 4.0, 0.08), 64.0)
add(pad(CH[0], 6.0, 0.09), 67.6)
add(ball_bounce(), 64.6, 0.9); add(ball_bounce(), 65.5, 0.7)
add(impact(), 68.0, 1.0)
add(swish(), 68.9, 1.1)

mix = np.stack([L, R], axis=1)
# gentle master: soft clip + fade out
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
fade = np.ones(N); fl = int(2.5 * SR); fade[-fl:] = np.linspace(1, 0, fl)
mix *= fade[:, None] * 0.9
pcm = (mix * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote", sys.argv[1], DUR, "s")
