"""ruNit Direct — narration + timeline.

Voices each line with Piper (offline TTS) and writes:
  trailer/direct/vo/<id>.wav   one file per line
  trailer/direct/timeline.json segment timings used by direct.html and mix.py

Voice: Piper "en_US libritts high", speaker 12. Dataset LibriTTS (CC BY 4.0) — credit in the end card.
Usage: PIPER=/path/to/piper MODEL=/path/to/en-us-libritts-high.onnx python3 trailer/direct/narration.py
"""
import json, os, subprocess, wave
from pathlib import Path

HERE = Path(__file__).parent
PIPER = os.environ.get("PIPER", "piper")
MODEL = os.environ["MODEL"]
SPEAKER = os.environ.get("SPEAKER", "12")

# "ruNit" is spelled "run it" for the voice so it's pronounced right.
SEGMENTS = [
    {"id": "open", "kind": "open", "dur": 4.6},
    {"id": "intro", "kind": "shot", "visual": "intro",
     "vo": "Hi, and welcome to the run it Direct. We have a lot to show you today, so let's jump right in."},
    {"id": "find", "kind": "segment", "title": "Find a run", "visual": "find",
     "vo": "Open the app, and you'll see who's got next. Every run is drawn as the court it's played on. Tap an open spot, and you're in."},
    {"id": "call", "kind": "segment", "title": "Call your own", "visual": "call",
     "vo": "Want to host? Pick a court, a time, and a format. Players nearby fill the open spots."},
    {"id": "prove", "kind": "segment", "title": "Play. Then prove it.", "visual": "prove",
     "vo": "When the game ends, everyone enters their own stats. If the numbers don't add up, players sort it out together. Nothing counts until the other team confirms."},
    {"id": "know", "kind": "segment", "title": "Know your game", "visual": "know",
     "vo": "Then, one question. How did you get your points today? Over time, your answers become your Player D N A."},
    {"id": "own", "kind": "segment", "title": "Own the court", "visual": "own",
     "vo": "Every court keeps its own record book. Most wins. Longest streak. Best game. And somebody's name at the top."},
    {"id": "stamp", "kind": "segment", "title": "Stamp your passport", "visual": "stamp",
     "vo": "Win at a court, and it gets stamped in your passport. Now try winning at every court in your state."},
    {"id": "more", "kind": "segment", "title": "One more thing", "visual": "globe",
     "vo": "Oh, and one more thing. The ball is round. So we put every court on it.", "tail": 3.4},
    {"id": "close", "kind": "close", "visual": "close",
     "vo": "Run it. Your city. Your court. Your run. Coming first to Hazleton and Scranton. Thanks for watching."},
]

# On-screen captions use the real spelling.
def caption_text(s: str) -> str:
    return s.replace("run it Direct", "ruNit Direct").replace("Player D N A", "Player DNA").replace("Run it.", "ruNit.")

CARD = 1.7       # segment title card
LEAD = 0.45      # picture before the voice starts
TAIL = 0.9       # picture after the voice ends
GAP_CLOSE = 3.2  # end card hold after the last line

def synth(text: str, out: Path) -> float:
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([PIPER, "--model", MODEL, "--speaker", SPEAKER, "--length_scale", "1.04",
                    "--sentence_silence", "0.32", "--output_file", str(out)],
                   input=text.encode(), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with wave.open(str(out)) as w:
        return w.getnframes() / w.getframerate()

t = 0.0
timeline = []
for seg in SEGMENTS:
    entry = {k: v for k, v in seg.items() if k != "vo"}
    entry["start"] = round(t, 3)
    if seg["kind"] == "open":
        t += seg["dur"]
    else:
        if seg["kind"] == "segment":
            entry["cardStart"] = round(t, 3); t += CARD
        entry["shotStart"] = round(t, 3)
        dur = synth(seg["vo"], HERE / "vo" / f"{seg['id']}.wav")
        entry["voStart"] = round(t + LEAD, 3)
        entry["voDur"] = round(dur, 3)
        # sentence-level captions, timed by character share of the line
        sents = [x.strip() for x in seg["vo"].replace("?", "?|").replace(". ", ".|").split("|") if x.strip()]
        total = sum(len(x) for x in sents)
        c, caps = entry["voStart"], []
        for x in sents:
            d = dur * len(x) / total
            caps.append({"t0": round(c, 3), "t1": round(c + d, 3), "text": caption_text(x)})
            c += d
        entry["captions"] = caps
        t += LEAD + dur + (GAP_CLOSE if seg["kind"] == "close" else seg.get("tail", TAIL))
    entry["end"] = round(t, 3)
    timeline.append(entry)

json.dump({"duration": round(t, 3), "segments": timeline}, open(HERE / "timeline.json", "w"), indent=1)
print(f"total {t:.1f}s")
for e in timeline:
    print(f"  {e['id']:6} {e['start']:6.1f} → {e['end']:6.1f}  vo {e.get('voDur', 0):.1f}s")
