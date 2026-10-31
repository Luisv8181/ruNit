"""ruNit broadcast trailer: score, sound design and narration mix. Everything is synthesized here (original).
100 BPM in F minor, one chord per bar: Fm, Db, Ab, Eb.
Usage: python3 trailer/broadcast/mix.py  ->  trailer/broadcast/out/mix.wav
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
BOUNCES = [2.4, 3.0, 3.5, 3.9, 4.2]
LAMPS = [0.6, 1.2, 1.8]
CONTACT = S["bump"]["start"] + 6 * BEAT


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
ROOTS = [43.65, 69.30, 51.91, 77.78]
CHORDS = [[174.6, 207.7, 261.6], [138.6, 174.6, 207.7], [207.7, 261.6, 311.1], [155.6, 196.0, 233.1]]
start_beat = S["title"]["start"]


def bar_index(t):
    return int(round((t - start_beat) / BAR)) % 4


def beat_section(t0, t1, intensity=1.0, double_hats=False):
    t = t0
    while t < t1 - 1e-6:
        b = bar_index(t)
        for k in range(16):  # sixteenths
            tt = t + k * BEAT / 4
            if tt >= t1: break
            if k in (0, 10) or (k == 7 and b % 2): place(drums, kick(intensity), tt, 0.9)
            if k in (4, 12): place(drums, clap(), tt, 0.55, send=send_room, amt=0.35)
            if k % 2 == 0 or (double_hats and True): place(drums, hat(k == 14 and b == 3), tt, 0.5 if k % 4 == 0 else 0.32, pan=0.25)
            if b == 3 and k in (13, 15): place(drums, hat(), tt, 0.25, pan=0.25)
        place(music, sub808(ROOTS[b], BAR * 0.95), t, 0.85)
        t += BAR


def pads(t0, t1, cutoff=1500, g=0.05):
    t = t0
    while t < t1 - 1e-6:
        place(music, pad(CHORDS[bar_index(t)], min(BAR + 0.4, t1 - t + 0.4), cutoff, g), t, 1.0, send=send_hall, amt=0.5)
        t += BAR


MOTIF = [523.25, 415.3, 349.2, 311.1, 349.2]  # C5 Ab4 F4 Eb4 F4


def motif(t0, g=0.18):
    for i, f in enumerate(MOTIF):
        place(music, bell(f), t0 + i * BEAT * (1 if i < 4 else 2), g, pan=(-0.3 + 0.15 * i), send=send_hall, amt=0.6)


title, score, bump, globe, montage, end = S["title"], S["score"], S["bump"], S["globe"], S["montage"], S["end"]

# cold open: room tone, lamps, dribbles, squeak, reverse cymbal into the drop
place(fx, np.stack([filt(noise(int(4.8 * SR)), "low", 500)] * 2, 1) * 0.02, 0)
for t in LAMPS: place(fx, lamp(0.55), t, 1.0, pan=[-0.5, 0, 0.5][LAMPS.index(t)], send=send_room, amt=0.4)
for i, t in enumerate(BOUNCES): place(fx, dribble(1.0 - i * 0.08), t, 0.9, send=send_room, amt=0.9)
place(fx, squeak(), 4.35, 0.8, pan=0.3, send=send_room, amt=0.5)
place(music, pad(CHORDS[0], 2.6, 900, 0.035, attack=1.6), 2.4, 1.0, send=send_hall, amt=0.5)
place(fx, reverse_cymbal(1.6), title["start"] - 1.6, 1.0)

# drop into the main beat
place(fx, impact(1.0), title["start"], 0.85, send=send_hall, amt=0.3)
beat_section(title["start"], bump["start"])
pads(title["start"], bump["start"])
motif(title["start"] + BEAT)
for s in ["find", "next", "score"]:
    place(fx, whoosh(), S[s]["start"] - 0.35, 0.9)

# score scene: a tick on every state change, the buzzer on the final
for k in range(1, 8): place(fx, tick(0.2, 1700 + 60 * k), score["start"] + k * BEAT, 1.0, pan=0.2)
place(fx, buzzer(), score["start"] + 7 * BEAT + 0.05, 1.0, send=send_room, amt=0.5)

# bump: stop-time, heartbeat, rise, contact
for k in range(6): place(drums, filt(kick(0.6), "low", 180), bump["start"] + k * BEAT, 0.55)
place(music, pad(CHORDS[0], 2 * BAR + 0.4, 700, 0.06, attack=0.4), bump["start"], 1.0, send=send_hall, amt=0.5)
place(fx, riser(CONTACT - bump["start"] - 1.0, 200, 5000, 0.28), bump["start"] + 1.0, 1.0)
place(fx, impact(1.1, 3.0), CONTACT, 0.9, send=send_hall, amt=0.35)
place(music, bell(1318.5, 2.6, 0.2), CONTACT, 1.0, pan=-0.2, send=send_hall, amt=0.7)
place(music, bell(1975.5, 2.6, 0.14), CONTACT + 0.07, 1.0, pan=0.2, send=send_hall, amt=0.7)
place(fx, swish(0.45), CONTACT + 0.02, 1.0)
place(fx, crowd(2.2, 0.22) * np.minimum(1, np.exp(-T(int(2.2 * SR)) * 1.4))[:, None], CONTACT + 0.05, 1.0, send=send_hall, amt=0.3)
back = bump["start"] + 2 * BAR
beat_section(back, globe["start"])
pads(back, globe["start"])
place(fx, impact(0.7), back, 0.6)
for s in ["box", "records", "passport", "friends", "looks"]:
    place(fx, whoosh(), S[s]["start"] - 0.35, 0.9)
place(fx, swish(0.4), S["records"]["start"] + 3 * BEAT, 1.0)
for k in range(3): place(fx, tick(0.2, 2100 + 150 * k), S["looks"]["start"] + (2 + k) * BEAT, 1.0, pan=-0.4 + 0.4 * k)

# globe: breakdown
place(fx, impact(0.8, 3.5), globe["start"], 0.7, send=send_hall, amt=0.5)
pads(globe["start"], globe["end"], cutoff=900, g=0.06)
for k, f in enumerate([349.2, 415.3, 523.25, 622.3, 698.5, 523.25]):
    place(music, bell(f, 2.6, 0.12), globe["start"] + BEAT * (2 + 3 * k), 1.0, pan=(-0.5 + 0.2 * k), send=send_hall, amt=0.8)
place(music, sub808(ROOTS[0], 2 * BAR), globe["start"], 0.5)
place(fx, riser(BAR, 250, 9000, 0.4), globe["end"] - BAR, 1.0)
for k in range(8): place(drums, clap(), globe["end"] - BAR / 2 + k * BEAT / 16 * 8 / 4, 0.18 + k * 0.05, send=send_room, amt=0.3)
place(fx, reverse_cymbal(1.2, 0.35), globe["end"] - 1.2, 1.0)

# montage: double-time hats, a hit on every cut
place(fx, impact(1.0), montage["start"], 0.8, send=send_hall, amt=0.3)
beat_section(montage["start"], montage["end"], 1.1, double_hats=True)
pads(montage["start"], montage["end"], cutoff=2200, g=0.055)
for k in range(1, 8): place(fx, whoosh(0.25, 0.18), montage["start"] + k * BEAT - 0.12, 1.0, pan=(-0.4 if k % 2 else 0.4))
place(fx, reverse_cymbal(1.2, 0.35), end["start"] - 1.2, 1.0)

# end card: big hit, crowd swell, last chord rings out
place(fx, impact(1.25, 4.5), end["start"], 0.95, send=send_hall, amt=0.45)
cr = crowd(6.5, 0.3); cr *= (np.minimum(1, T(len(cr)) / 0.25) * np.exp(-T(len(cr)) * 0.45))[:, None]
place(fx, cr, end["start"] + 0.05, 1.0, send=send_hall, amt=0.2)
place(music, pad(CHORDS[0], DUR - end["start"], 1100, 0.065, attack=0.2), end["start"], 1.0, send=send_hall, amt=0.6)
place(music, sub808(ROOTS[0], 3.5), end["start"], 0.8)
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
