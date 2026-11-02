"""ruNit vertical story trailer: score, sound design and narration mix. Everything is synthesized here (original).
110 BPM in A minor, one chord per bar: Am, F, C, G. Brighter and more driving than the broadcast cut.
Usage: python3 trailer/vertical/mix.py  ->  trailer/vertical/out/mix.wav
"""
import json, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

HERE = Path(__file__).parent
TL = json.load(open(HERE / "timeline.json"))
S = {s["id"]: s for s in TL["scenes"]}
SR = 48000
BEAT, BAR = TL["beat"], TL["bar"]
DUR = TL["duration"] + 1.0
N = int(SR * DUR)
rng = np.random.default_rng(23)

# buses: (N, 2)
drums = np.zeros((N, 2)); music = np.zeros((N, 2)); fx = np.zeros((N, 2)); vo = np.zeros(N)
send_room = np.zeros((N, 2)); send_hall = np.zeros((N, 2))

# shared with film.html
BUZZ = [0.3, 0.55]
CONTACT = S["play"]["start"] + 9 * BEAT


def T(n):
    return np.arange(n) / SR


def filt(x, kind, f, order=2):
    sos = butter(order, f, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x)


def env(n, a, d, hold=0.0):
    t = T(n)
    e = np.minimum(1, t / max(a, 1e-4))
    return e * np.where(t < a + hold, 1, np.exp(-(t - a - hold) / d))


def place(buf, sig, t, gain=1.0, pan=0.0, send=None, amt=0.0):
    i = int(round(t * SR))
    if i >= len(buf) or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]; i = 0
    sig = sig[: len(buf) - i] * gain
    l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    if buf.ndim == 1:
        buf[i:i + len(sig)] += sig
        return
    if sig.ndim == 1:
        st = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    else:
        st = sig
    buf[i:i + len(st)] += st
    if send is not None and amt:
        send[i:i + len(st)] += st * amt


def noise(n):
    return rng.standard_normal(n)


def ir(seconds, damp=4000, pre=0.012):
    n = int(seconds * SR)
    t = T(n)
    base = np.stack([noise(n), noise(n)], 1) * np.exp(-t * 6.9 / seconds)[:, None]
    base[:, 0] = filt(base[:, 0], "low", damp); base[:, 1] = filt(base[:, 1], "low", damp)
    out = np.zeros((n + int(pre * SR), 2)); out[int(pre * SR):] = base
    return out / np.sqrt((out ** 2).sum(0, keepdims=True))


def reverb(x, impulse, wet):
    y = np.stack([fftconvolve(x[:, c], impulse[:, c])[: len(x)] for c in range(2)], 1)
    return y * wet


# ---------------- instruments ----------------
def kick(power=1.0):
    n = int(0.45 * SR); t = T(n)
    f = 46 + 110 * np.exp(-t * 32)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.22)
    click = filt(noise(n), "band", [1800, 6000]) * env(n, 0.0005, 0.004) * 0.2
    return filt(np.tanh((s + click) * 1.4 * power), "low", 9000) * 0.9


def clap():
    n = int(0.5 * SR); t = T(n); s = np.zeros(n)
    for k, off in enumerate([0, 0.009, 0.018, 0.028]):
        i = int(off * SR); m = n - i
        s[i:] += filt(noise(m), "band", [900, 5200]) * env(m, 0.0004, 0.012 if k < 3 else 0.11)
    body = np.sin(2 * np.pi * 185 * t) * env(n, 0.001, 0.05) * 0.5
    return (s * 0.8 + body) * 0.7


def hat(open_=False):
    n = int((0.32 if open_ else 0.06) * SR)
    return filt(noise(n), "high", 7500) * env(n, 0.0008, 0.11 if open_ else 0.016) * 0.32


def sub808(f, d):
    n = int(d * SR); t = T(n)
    glide = f * (1 + 0.35 * np.exp(-t * 40))
    s = np.sin(2 * np.pi * np.cumsum(glide) / SR) * env(n, 0.004, d * 0.45)
    return np.tanh(s * 1.8) * 0.55


def saw(f, n, det):
    t = T(n); out = np.zeros(n)
    for h in range(1, 14):
        out += np.sin(2 * np.pi * h * f * (1 + det) * t + rng.random() * 6.28) / h
    return out


def pad(freqs, d, cutoff=1400, g=0.05, attack=0.9):
    n = int(d * SR); s = np.zeros((n, 2))
    for f in freqs:
        for c, det in enumerate((-0.004, 0.004)):
            s[:, c] += saw(f, n, det)
    s[:, 0] = filt(s[:, 0], "low", cutoff); s[:, 1] = filt(s[:, 1], "low", cutoff)
    t = T(n); fade = np.minimum(1, t / attack) * np.minimum(1, (d - t) / 0.6)
    return s * fade[:, None] * g / len(freqs)


def bell(f, d=2.2, g=0.22):
    n = int(d * SR); t = T(n)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t * 3)
    s = np.sin(2 * np.pi * f * t + mod) * env(n, 0.002, d * 0.35)
    return s * g


def riser(d, f0=300, f1=7000, g=0.35):
    n = int(d * SR); t = T(n)
    x = noise(n); out = np.zeros(n); blk = 2048
    for i in range(0, n, blk):
        p = i / n; fc = f0 * (f1 / f0) ** p
        seg = x[i:i + blk]
        out[i:i + blk] = filt(seg, "band", [fc * 0.7, min(fc * 1.4, 20000)], 1)
    tone = np.sin(2 * np.pi * np.cumsum(120 * (8 ** (t / d))) / SR) * 0.25
    return (out + tone) * (t / d) ** 2.2 * g


def impact(g=1.0, tail=2.5):
    n = int(tail * SR); t = T(n)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t * 9)) / SR) * env(n, 0.002, 0.9)
    crash = filt(noise(n), "low", 6000) * env(n, 0.001, 0.35) * 0.5
    return np.tanh((boom + crash) * 1.4) * g


def whoosh(d=0.5, g=0.25):
    n = int(d * SR); t = T(n)
    x = filt(noise(n), "band", [600, 5000])
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return x * e * g


def reverse_cymbal(d=1.6, g=0.3):
    n = int(d * SR); t = T(n)
    return filt(noise(n), "high", 4000) * (t / d) ** 3 * g


# ---------------- foley ----------------
def dribble(g=1.0):
    n = int(0.25 * SR); t = T(n)
    thump = np.sin(2 * np.pi * np.cumsum(70 + 80 * np.exp(-t * 60)) / SR) * env(n, 0.0008, 0.05)
    slap = filt(noise(n), "band", [400, 2500]) * env(n, 0.0005, 0.012) * 0.6
    return (thump + slap) * 0.9 * g


def squeak(g=0.25):
    d = 0.16; n = int(d * SR); t = T(n)
    f = 2600 + 900 * (t / d) + 120 * np.sin(2 * np.pi * 38 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.sin(np.pi * t / d) ** 0.6
    return s * g


def swish(g=0.4):
    d = 0.45; n = int(d * SR); t = T(n)
    x = filt(noise(n), "band", [2200, 9000])
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 38 * t)
    return x * am * env(n, 0.03, 0.12) * g


def lamp(g=0.5):
    n = int(1.6 * SR); t = T(n)
    thud = np.sin(2 * np.pi * 70 * t) * env(n, 0.001, 0.06)
    ring = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) * a for f, k, a in [(420, 9, .35), (1130, 14, .2), (2140, 20, .12)])
    hum = filt(np.sin(2 * np.pi * 120 * t) + 0.25 * np.sin(2 * np.pi * 240 * t) + 0.12 * np.sin(2 * np.pi * 360 * t), "low", 900) * 0.05 * np.minimum(1, t / 0.3) * np.exp(-t * 1.2)
    return (thud + ring + hum) * g


def buzzer(d=0.9, g=0.22):
    n = int(d * SR); t = T(n)
    s = np.sign(np.sin(2 * np.pi * 233 * t)) * 0.6 + np.sign(np.sin(2 * np.pi * 349.5 * t)) * 0.4
    return filt(s, "low", 3000) * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.04) * g


def tick(g=0.18, f=1900):
    n = int(0.05 * SR); t = T(n)
    return np.sin(2 * np.pi * f * t) * env(n, 0.0005, 0.012) * g


def crowd(d, g=0.25):
    n = int(d * SR); t = T(n)
    x = np.stack([filt(noise(n), "band", [250, 3200]), filt(noise(n), "band", [250, 3200])], 1)
    am = 0.75 + 0.25 * filt(noise(n), "low", 3)
    am = am / np.abs(am).max()
    return x * am[:, None] * g


# ---------------- arrangement ----------------
ROOTS = [55.0, 43.65, 65.41, 49.0]                       # A1, F1, C2, G1
CHORDS = [[220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 261.6, 329.6], [196.0, 246.9, 293.7]]
start_beat = S["call"]["start"]


def bar_index(t):
    return int(round((t - start_beat) / BAR)) % 4


def beat_section(t0, t1, intensity=1.0, double_hats=False):
    t = t0
    while t < t1 - 1e-6:
        b = bar_index(t)
        for k in range(16):
            tt = t + k * BEAT / 4
            if tt >= t1: break
            if k in (0, 6, 10) or (k == 3 and b % 2): place(drums, kick(intensity), tt, 0.9)
            if k in (4, 12): place(drums, clap(), tt, 0.6, send=send_room, amt=0.3)
            if k % 2 == 0 or double_hats: place(drums, hat(k == 6), tt, 0.5 if k % 4 == 2 else 0.3, pan=-0.2)
            if k in (7, 15): place(drums, tick(0.08, 900), tt, 1.0, pan=0.4)   # rim tick
        place(music, sub808(ROOTS[b], BAR * 0.9), t, 0.8)
        t += BAR


def pads(t0, t1, cutoff=1800, g=0.045):
    t = t0
    while t < t1 - 1e-6:
        place(music, pad(CHORDS[bar_index(t)], min(BAR + 0.3, t1 - t + 0.3), cutoff, g, attack=0.5), t, 1.0, send=send_hall, amt=0.45)
        t += BAR


def arp(t0, t1, g=0.09):
    t = t0; k = 0
    while t < t1 - 1e-6:
        ch = CHORDS[bar_index(t)]
        notes = [ch[0] * 2, ch[1] * 2, ch[2] * 2, ch[1] * 2]
        place(music, pluck(notes[k % 4]), t, g, pan=(-0.35 if k % 2 else 0.35), send=send_hall, amt=0.35)
        t += BEAT / 2; k += 1


def pluck(f, d=0.5):
    n = int(d * SR); t = T(n)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 10)
    return s * env(n, 0.002, d * 0.25)


MOTIF = [659.3, 523.25, 440.0, 392.0, 440.0]   # E5 C5 A4 G4 A4


def motif(t0, g=0.17):
    for i, f in enumerate(MOTIF):
        place(music, bell(f), t0 + i * BEAT * (1 if i < 4 else 2), g, pan=(-0.3 + 0.15 * i), send=send_hall, amt=0.6)


def buzz(d=0.18):
    n = int(d * SR); t = T(n)
    return np.tanh(np.sin(2 * np.pi * 150 * t) * 3) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 25 * t))) * env(n, 0.005, 0.12) * 0.25


hook, call, play, end = S["hook"], S["call"], S["play"], S["end"]

# hook: phone buzzes twice, notification chime, a sub swell into the drop
for t in BUZZ: place(fx, buzz(), t, 1.0, pan=0.2)
place(music, bell(1318.5, 1.6, 0.16), 0.95, 1.0, send=send_hall, amt=0.5)
place(music, bell(1760.0, 1.6, 0.12), 1.05, 1.0, send=send_hall, amt=0.5)
place(music, pad(CHORDS[0], hook["end"] - 0.6, 900, 0.04, attack=1.2), 0.6, 1.0, send=send_hall, amt=0.5)
place(fx, riser(BAR, 250, 8000, 0.33), hook["end"] - BAR, 1.0)
for i, t in enumerate([2.9, 3.3, 3.7, 4.0]): place(fx, dribble(0.7 + 0.08 * i), t, 0.8, send=send_room, amt=0.8)
place(fx, reverse_cymbal(1.3), call["start"] - 1.3, 1.0)

# main groove, with the stop-time bump inside the play scene
place(fx, impact(1.0), call["start"], 0.85, send=send_hall, amt=0.3)
stop0 = play["start"] + 8 * BEAT
beat_section(call["start"], stop0)
pads(call["start"], stop0)
arp(S["checkin"]["start"], stop0)
motif(call["start"] + BEAT)
for k in range(1, 8): place(fx, tick(0.2, 1700 + 60 * k), play["start"] + k * BEAT, 1.0, pan=0.2)
place(fx, riser(CONTACT - stop0, 300, 5000, 0.25), stop0, 1.0)
place(fx, impact(1.1, 3.0), CONTACT, 0.9, send=send_hall, amt=0.35)
place(music, bell(1318.5, 2.4, 0.2), CONTACT, 1.0, pan=-0.2, send=send_hall, amt=0.7)
place(music, bell(1975.5, 2.4, 0.14), CONTACT + 0.07, 1.0, pan=0.2, send=send_hall, amt=0.7)
place(fx, swish(0.45), CONTACT + 0.02, 1.0)
back = play["end"]
beat_section(back, end["start"])
pads(back, end["start"])
arp(S["dna"]["start"], end["start"])
for sid in ["call", "checkin", "play", "reflect", "dna", "custom", "king", "doors"]:
    place(fx, whoosh(0.4, 0.22), S[sid]["start"] - 0.28, 1.0)
place(fx, swish(0.4), S["king"]["start"] + 3 * BEAT, 1.0)
place(fx, crowd(2.0, 0.18) * np.exp(-T(int(2.0 * SR)) * 1.5)[:, None], S["king"]["start"] + 3 * BEAT, 1.0, send=send_hall, amt=0.3)
place(fx, reverse_cymbal(1.2, 0.35), end["start"] - 1.2, 1.0)

# end card
place(fx, impact(1.2, 4.0), end["start"], 0.95, send=send_hall, amt=0.45)
cr = crowd(5.0, 0.26); cr *= (np.minimum(1, T(len(cr)) / 0.2) * np.exp(-T(len(cr)) * 0.55))[:, None]
place(fx, cr, end["start"] + 0.05, 1.0, send=send_hall, amt=0.2)
place(music, pad(CHORDS[0], DUR - end["start"], 1300, 0.06, attack=0.2), end["start"], 1.0, send=send_hall, amt=0.6)
place(music, sub808(ROOTS[0], 3.0), end["start"], 0.8)
motif(end["start"] + 2 * BEAT, 0.16)

# ---------------- narration ----------------
for line in TL["lines"]:
    with wave.open(str(HERE / "vo" / f"{line['id']}.wav")) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    if sr != SR:
        x = np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)
    x = filt(x, "high", 90)
    place(vo, x / (np.abs(x).max() + 1e-9) * 0.8, line["start"])

# ---------------- mix ----------------
room = ir(1.4, 5000); hall = ir(3.2, 6000)
wet = reverb(send_room, room, 0.35) + reverb(send_hall, hall, 0.4)
vo_st = np.stack([vo, vo], 1)
vo_st += reverb(vo_st * 0.12, room, 0.6)
# duck music and drums under the voice
venv = np.abs(vo)
venv = filt(venv, "low", 6)
duck = 1 - 0.72 * np.clip(venv / (venv.max() + 1e-9) * 3, 0, 1)
bed = (drums * 0.95 + music * 1.0 + wet * 0.9) * duck[:, None] + fx * 0.9
bed = np.tanh(bed * 0.9) * 0.95
win = np.zeros(N, bool)
for line in TL["lines"]:
    win[int(line["start"] * SR):int((line["start"] + line["dur"]) * SR)] = True
rms = lambda x: 10 * np.log10((x[win] ** 2).mean() + 1e-12)
# voice sits about 5 dB over the (ducked) bed while it speaks
gain = 10 ** ((rms(bed) + 5 - rms(vo_st)) / 20)
mixd = bed + vo_st * gain
print(f"during narration: voice {rms(vo_st * gain):.1f} dB, bed {rms(bed):.1f} dB")
fade = np.ones(N); fl = int(1.0 * SR); fade[-fl:] = np.linspace(1, 0, fl)
mixd *= fade[:, None]
mixd /= np.abs(mixd).max() / 0.89
out = HERE / "out"; out.mkdir(exist_ok=True)
with wave.open(str(out / "mix.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mixd * 32767).astype(np.int16).tobytes())
print("wrote", out / "mix.wav", f"{DUR:.1f}s")
