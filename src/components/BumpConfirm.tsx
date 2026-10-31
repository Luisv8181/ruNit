"use client";

// "Bring your phones together" confirmation.
// Web build: each phone shows a QR code with its line; the other phone scans it (BarcodeDetector) or types a
// six-character match code. Native builds replace the QR step with Nearby Interaction (iPhone) / NFC (Android).
// Either way the result is the same: both players confirm each other's line in one move.

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Run } from "@/lib/types";
import { decodeBump, encodeBump } from "@/lib/bump";
import { friendCode } from "@/lib/friends";
import { bumpSound, nudge } from "@/lib/feel";
import { Avatar } from "./PlayerFigure";
import { Qr } from "./Qr";
import { DemoTag } from "./ui";

const matchCode = (s: string) => friendCode(s).replace("-", "");

type BarcodeDetectorLike = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

function Scanner({ onCode }: { onCode: (s: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "on" | "unsupported" | "denied">("starting");
  useEffect(() => {
    const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike };
    if (!W.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) { setStatus("unsupported"); return; }
    let stream: MediaStream | null = null, timer = 0, stop = false;
    const det = new W.BarcodeDetector({ formats: ["qr_code"] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((s) => {
      if (stop) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s; if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
      setStatus("on");
      const loop = async () => {
        if (stop || !video.current) return;
        try { const r = await det.detect(video.current); if (r[0]?.rawValue) { onCode(r[0].rawValue); return; } } catch { /* keep trying */ }
        timer = window.setTimeout(loop, 250);
      };
      loop();
    }).catch(() => setStatus("denied"));
    return () => { stop = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);
  if (status === "unsupported") return <p className="text-sm text-ink-2">This browser can&apos;t scan codes. Type their match code instead.</p>;
  if (status === "denied") return <p className="text-sm text-ink-2">Camera access was blocked. Type their match code instead, or allow the camera in your browser settings.</p>;
  return <video ref={video} muted playsInline className="aspect-square w-full rounded-xl bg-ink object-cover" aria-label="Camera view for scanning their code" />;
}

export function BumpConfirm({ run }: { run: Run }) {
  const { state, player, dispatch } = useStore();
  const [with_, setWith] = useState<string | null>(null);
  const [mode, setMode] = useState<"show" | "scan">("show");
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [meeting, setMeeting] = useState(false);
  const mine = run.submissions.find((s) => s.playerId === state.meId);
  const done = state.bumped[run.id] ?? [];
  const others = run.submissions.filter((s) => s.playerId !== state.meId);
  const payload = useMemo(() => mine && run.score ? encodeBump({ v: 1, run: run.id, code: run.code, player: state.meId, line: mine.line, score: [run.score.a, run.score.b] }) : "", [mine, run, state.meId]);
  if (!mine) return null;

  const theirs = with_ ? run.submissions.find((s) => s.playerId === with_) : undefined;
  const theirPayload = theirs && run.score ? encodeBump({ v: 1, run: run.id, code: run.code, player: theirs.playerId, line: theirs.line, score: [run.score.a, run.score.b] }) : "";

  const complete = (pid: string) => {
    setMeeting(true); bumpSound();
    setTimeout(() => { dispatch({ type: "bump", runId: run.id, playerId: pid }); setMeeting(false); setWith(null); setTyped(""); setErr(null); }, 900);
  };
  const onScanned = (raw: string) => {
    const p = decodeBump(raw);
    if (!p || p.run !== run.id) { nudge(); return setErr("That code isn't from this game."); }
    if (!run.participants.includes(p.player) || p.player === state.meId) { nudge(); return setErr("That player isn't in this game."); }
    complete(p.player);
  };
  const onTyped = () => {
    const hit = others.find((s) => run.score && matchCode(encodeBump({ v: 1, run: run.id, code: run.code, player: s.playerId, line: s.line, score: [run.score.a, run.score.b] })) === typed.toUpperCase().replace(/[^A-Z0-9]/g, ""));
    if (!hit) { nudge(); return setErr("No one in this game has that match code. Check it and try again."); }
    complete(hit.playerId);
  };

  return (
    <section aria-labelledby="bump-h">
      <h2 id="bump-h" className="display text-[2rem]">Confirm with a tap</h2>
      <p className="mt-1 text-[15px] text-ink-2">Bring your phone next to another player&apos;s. You both confirm each other&apos;s line at once.</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {others.map((s) => {
          const p = player(s.playerId)!;
          const ok = done.includes(s.playerId);
          return (
            <li key={s.playerId}>
              <button disabled={ok} onClick={() => { setWith(s.playerId); setMode("show"); setErr(null); }}
                className={`flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-4 text-[15px] font-bold transition-colors ${ok ? "border-emerald bg-emerald-soft text-emerald" : "border-ink/15 hover:border-ink"}`}>
                <Avatar config={p.character} size={30} /> {ok ? `${p.nickname} ✓` : p.nickname}
              </button>
            </li>
          );
        })}
      </ul>

      {with_ && theirs && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-ink/60 sm:place-items-center sm:p-6" onClick={() => !meeting && setWith(null)}>
          <div className="rise w-full max-w-md rounded-t-[28px] bg-paper p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Confirm with ${player(with_)?.nickname}`}>
            <div className="relative mx-auto h-28 w-56" aria-hidden>
              <div className={`absolute top-2 h-24 w-14 rounded-[14px] border-4 border-ink bg-ball transition-all duration-700 ${meeting ? "left-[78px] rotate-0" : "left-6 -rotate-6"}`} />
              <div className={`absolute top-2 h-24 w-14 rounded-[14px] border-4 border-ink bg-sun transition-all duration-700 ${meeting ? "right-[78px] rotate-0" : "right-6 rotate-6"}`} />
              {meeting && <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-emerald opacity-70 holo-pulse" />}
            </div>
            <h3 className="display mt-2 text-center text-[2rem]">{meeting ? "Confirmed" : `You and ${player(with_)?.nickname}`}</h3>

            {!meeting && (
              <>
                <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-ink/[.05] p-1" role="tablist">
                  <button role="tab" aria-selected={mode === "show"} className={`rounded-xl py-2 text-sm font-bold ${mode === "show" ? "bg-ink text-paper" : "text-ink-2"}`} onClick={() => setMode("show")}>Show my code</button>
                  <button role="tab" aria-selected={mode === "scan"} className={`rounded-xl py-2 text-sm font-bold ${mode === "scan" ? "bg-ink text-paper" : "text-ink-2"}`} onClick={() => setMode("scan")}>Scan theirs</button>
                </div>
                {mode === "show" ? (
                  <div className="mt-4 text-center">
                    <div className="mx-auto w-fit rounded-2xl bg-white p-3"><Qr value={payload} size={200} /></div>
                    <p className="mt-2 text-sm text-ink-2">They scan this from their phone. Or they type your match code:</p>
                    <p className="num mt-1 text-3xl tracking-[0.2em]">{matchCode(payload)}</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <Scanner onCode={onScanned} />
                    <div className="flex gap-2">
                      <input className="field num text-center text-xl uppercase tracking-[0.2em]" placeholder="Their match code" value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={7} aria-label="Their match code" />
                      <button className="btn-ink shrink-0" onClick={onTyped}>Confirm</button>
                    </div>
                  </div>
                )}
                {err && <p className="mt-3 text-sm font-semibold text-[#b4441a]" role="alert">{err}</p>}
                <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
                  <button className="btn-ghost px-0" onClick={() => setWith(null)}>Cancel</button>
                  <button className="btn-line" onClick={() => complete(with_)}><DemoTag>Demo</DemoTag> Their phone</button>
                </div>
                <p className="mt-2 text-xs text-ink-2">In this demo the other players are made up, so &quot;Their phone&quot; stands in for theirs. Their match code is {matchCode(theirPayload)}.</p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
