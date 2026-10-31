"""ruNit broadcast trailer: narration + beat-grid timeline.

Every scene is a whole number of bars at 100 BPM, so cuts, hits and the music line up.
Voices each line with Piper (offline TTS) and writes:
  trailer/broadcast/vo/<id>.wav      one file per line
  trailer/broadcast/timeline.json    scene and voice timings for film.html and mix.py

Voice: Piper "en_US libritts high", speaker 12. Dataset LibriTTS (CC BY 4.0), credited on the end card.
Usage: PIPER=/path/to/piper MODEL=/path/to/en-us-libritts-high.onnx python3 trailer/broadcast/plan.py
"""
import json, math, os, subprocess, wave
from pathlib import Path

HERE = Path(__file__).parent
PIPER = os.environ.get("PIPER", "piper")
MODEL = os.environ["MODEL"]
SPEAKER = os.environ.get("SPEAKER", "12")
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT

# (scene id, minimum bars, [(line id, text spoken, caption text, offset in beats from scene start)])
# "ruNit" is spelled "run it" for the voice.
SCENES = [
    ("cold", 2, []),
    ("title", 2, [("title", "This is run it.", "This is ruNit.", 1.5)]),
    ("find", 2, [("find", "Find a run near you. Tap a spot, and you're in.", "Find a run near you. Tap a spot, and you're in.", 0.5)]),
    ("next", 2, [("next", "Got next? Put your name down.", "Got next? Put your name down.", 0.5)]),
    ("score", 2, [("score", "Keep score with one tap.", "Keep score with one tap.", 0.5)]),
    ("bump", 3, [("bump1", "Game over? Bring your phones together.", "Game over? Bring your phones together.", 0.25),
                 ("bump2", "Both lines. Confirmed.", "Both lines. Confirmed.", 7.0)]),
    ("box", 2, [("box", "Nothing counts until the other team signs off.", "Nothing counts until the other team signs off.", 0.5)]),
    ("records", 2, [("records", "Every court keeps a record book.", "Every court keeps a record book.", 0.5)]),
    ("passport", 2, [("passport", "Now win every court in your state.", "Now win every court in your state.", 0.5)]),
    ("friends", 2, [("friends", "Settle it with your friends. Then post the proof.", "Settle it with your friends. Then post the proof.", 0.5)]),
    ("looks", 2, [("looks", "Make it yours.", "Make it yours.", 1.0)]),
    ("globe", 3, [("globe", "The ball is round. So we put every court on it.", "The ball is round. So we put every court on it.", 1.0)]),
    ("montage", 2, []),
    ("end", 3, [("end", "Run it. Your city. Your court. Your run. Coming first to Hazleton and Scranton.",
                 "ruNit. Your city. Your court. Your run. Coming first to Hazleton and Scranton.", 1.0)]),
]
TAIL = 2.4  # end card hold after the last bar


def synth(text: str, out: Path) -> float:
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([PIPER, "--model", MODEL, "--speaker", SPEAKER, "--length_scale", "0.98",
                    "--sentence_silence", "0.28", "--output_file", str(out)],
                   input=text.encode(), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with wave.open(str(out)) as w:
        return w.getnframes() / w.getframerate()


def captions(text: str, start: float, dur: float):
    parts = [x.strip() for x in text.replace("? ", "?|").replace(". ", ".|").split("|") if x.strip()]
    total = sum(len(x) for x in parts)
    c, out = start, []
    for x in parts:
        d = dur * len(x) / total
        out.append({"t0": round(c, 3), "t1": round(c + d, 3), "text": x})
        c += d
    return out


t = 0.0
scenes, lines = [], []
for sid, bars, vo in SCENES:
    need = bars
    entry_lines = []
    for lid, spoken, cap, off in vo:
        dur = synth(spoken, HERE / "vo" / f"{lid}.wav")
        start = off * BEAT
        need = max(need, math.ceil((start + dur + 0.35) / BAR))
        entry_lines.append((lid, cap, start, dur))
    for lid, cap, start, dur in entry_lines:
        lines.append({"id": lid, "scene": sid, "start": round(t + start, 3), "dur": round(dur, 3),
                      "captions": captions(cap, t + start, dur)})
    scenes.append({"id": sid, "start": round(t, 3), "bars": need, "end": round(t + need * BAR, 3)})
    t += need * BAR

total = t + TAIL
json.dump({"bpm": BPM, "beat": BEAT, "bar": BAR, "duration": round(total, 3), "scenes": scenes, "lines": lines},
          open(HERE / "timeline.json", "w"), indent=1)
print(f"total {total:.1f}s")
for s in scenes:
    print(f"  {s['id']:9} {s['start']:6.1f} -> {s['end']:6.1f}  {s['bars']} bars")
for l in lines:
    print(f"  vo {l['id']:9} {l['start']:6.2f} +{l['dur']:.2f}")
