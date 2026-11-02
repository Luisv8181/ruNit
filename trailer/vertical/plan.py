"""ruNit vertical (9:16) story trailer: narration + beat-grid timeline. One player's night, start to finish.

Every scene is a whole number of bars at 100 BPM, so cuts, hits and the music line up.
Voices each line with Piper (offline TTS) and writes:
  trailer/vertical/vo/<id>.wav      one file per line
  trailer/vertical/timeline.json    scene and voice timings for film.html and mix.py

Voice: Piper "en_US libritts high", speaker 12. Dataset LibriTTS (CC BY 4.0), credited on the end card.
Usage: PIPER=/path/to/piper MODEL=/path/to/en-us-libritts-high.onnx python3 trailer/vertical/plan.py
"""
import json, math, os, subprocess, wave
from pathlib import Path

HERE = Path(__file__).parent
PIPER = os.environ.get("PIPER", "piper")
MODEL = os.environ["MODEL"]
SPEAKER = os.environ.get("SPEAKER", "12")
BPM = 110
BEAT = 60 / BPM
BAR = 4 * BEAT

# (scene id, minimum bars, [(line id, text spoken, caption text, offset in beats from scene start)])
# "ruNit" is spelled "run it" for the voice.
SCENES = [
    ("hook", 2, [("hook", "You've got next.", "You've got next.", 2.0)]),
    ("call", 2, [("call", "Call a run. Pick the court, the time, the format.", "Call a run. Pick the court, the time, the format.", 0.5)]),
    ("checkin", 2, [("checkin", "Scan in at the court. Teams pick themselves.", "Scan in at the court. Teams pick themselves.", 0.5)]),
    ("play", 3, [("play", "Tap the score. Then tap phones to confirm it.", "Tap the score. Then tap phones to confirm it.", 0.5)]),
    ("reflect", 2, [("reflect", "Then one question. How did you score today?", "Then one question. How did you score today?", 0.5)]),
    ("dna", 2, [("dna", "Every answer builds your Player D N A.", "Every answer builds your Player DNA.", 0.5)]),
    ("custom", 2, [("custom", "Build your player. Unlock your style.", "Build your player. Unlock your style.", 0.5)]),
    ("king", 2, [("king", "Win enough, and the court is yours.", "Win enough, and the court is yours.", 0.5)]),
    ("doors", 2, [("doors", "And the run opens doors.", "And the run opens doors.", 0.5)]),
    ("end", 3, [("end", "Run it. Coming first to Hazleton and Scranton.", "ruNit. Coming first to Hazleton and Scranton.", 1.0)]),
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
