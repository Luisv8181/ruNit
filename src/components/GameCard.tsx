"use client";

// Game card: a 1080×1920 story-sized image of a saved game, drawn on canvas in the browser.
// Share via the system share sheet where supported, or download.

import { useEffect, useRef, useState } from "react";
import { useStore, verificationOf } from "@/lib/store";
import type { Run } from "@/lib/types";
import { TANK } from "./PlayerFigure";
import { NET_EDGES, NET_NODES } from "./ui";

const VLABEL = { self: "Self-reported", participant: "Teammate-confirmed", opponent: "Opponent-confirmed", video: "Video-supported" } as const;

export function GameCard({ run }: { run: Run }) {
  const { state, me, court } = useStore();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const rec = state.history.find((h) => h.runId === run.id);
  const mine = run.submissions.find((s) => s.playerId === state.meId);
  const c = court(run.courtId);

  useEffect(() => {
    if (!rec || !mine || !c) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      const cv = canvas.current; if (!cv || cancelled) return;
      const x = cv.getContext("2d")!; const W = 1080, H = 1920;
      cv.width = W; cv.height = H;
      // background
      x.fillStyle = "#1b2326"; x.fillRect(0, 0, W, H);
      const g = x.createRadialGradient(W * 0.7, H * 0.18, 40, W * 0.7, H * 0.18, W * 1.1);
      g.addColorStop(0, "rgba(244,123,53,.55)"); g.addColorStop(1, "rgba(244,123,53,0)");
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      // half court lines, quietly
      x.strokeStyle = "rgba(255,249,240,.08)"; x.lineWidth = 6;
      x.strokeRect(90, 1180, 900, 620); x.strokeRect(370, 1180, 340, 360);
      x.beginPath(); x.arc(540, 1540, 120, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.moveTo(140, 1180); x.lineTo(140, 1430); x.arc(540, 1430, 400, Math.PI, 0, true); x.lineTo(940, 1180); x.stroke();
      // logo
      const nx = (px: number) => 70 + px * 4.4, ny = (py: number) => 14 + (py - 4) * 4.4;
      x.strokeStyle = "#F47B35"; x.fillStyle = "#F47B35"; x.lineCap = "round";
      x.lineWidth = 9; x.beginPath(); x.ellipse(nx(16), ny(9), 12 * 4.4, 3 * 4.4, 0, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 4; x.globalAlpha = 0.85;
      for (const seg of NET_EDGES.slice(1).split("M")) { const [a, b] = seg.split("L").map((q) => q.split(" ").map(Number)); x.beginPath(); x.moveTo(nx(a[0]), ny(a[1])); x.lineTo(nx(b[0]), ny(b[1])); x.stroke(); }
      x.globalAlpha = 1;
      for (const [px, py] of NET_NODES) { x.beginPath(); x.arc(nx(px), ny(py), 5.5, 0, Math.PI * 2); x.fill(); }
      x.fillStyle = "#FFF9F0"; x.lineWidth = 5; x.beginPath(); x.arc(nx(16), ny(22), 10.5, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = "#FFF9F0"; x.font = "800 72px 'Big Shoulders Display Variable'"; x.textBaseline = "middle"; x.fillText("RUN IT", 215, 142);
      // seal
      const v = verificationOf(mine, run);
      x.font = "700 30px 'Atkinson Hyperlegible Next Variable'"; const sl = VLABEL[v]; const sw = x.measureText(sl).width + 70;
      x.fillStyle = v === "opponent" ? "#239B72" : "rgba(255,249,240,.15)"; x.beginPath(); x.roundRect(W - 90 - sw, 106, sw, 72, 36); x.fill();
      x.fillStyle = "#FFF9F0"; x.fillText((v === "opponent" ? "✓ " : "") + sl, W - 90 - sw + 32, 143);
      // result
      x.fillStyle = rec.result === "W" ? "#F4C65E" : "rgba(255,249,240,.75)"; x.font = "800 150px 'Big Shoulders Display Variable'";
      x.fillText(rec.result === "W" ? "Dub." : "Run it back.", 90, 330);
      x.fillStyle = "#FFF9F0"; x.font = "800 330px 'Big Shoulders Display Variable'"; x.fillText(rec.score.replace("–", "-"), 80, 560);
      x.fillStyle = "rgba(255,249,240,.75)"; x.font = "600 40px 'Atkinson Hyperlegible Next Variable'";
      x.fillText(`${c.name}, ${c.city}`, 92, 740);
      x.fillText(`${run.format} to ${run.target}${run.mode === "ranked" ? ", ranked" : ""}.  ${new Date(rec.date).toLocaleDateString([], { month: "long", day: "numeric" })}`, 92, 800);
      // line
      const stats: [string, number][] = [["PTS", mine.line.pts], ["REB", mine.line.reb], ["AST", mine.line.ast], ["STL", mine.line.stl]];
      stats.forEach(([k, n], i) => {
        const sx = 92 + i * 240;
        x.fillStyle = i === 0 ? "#F4C65E" : "#FFF9F0"; x.font = "800 150px 'Big Shoulders Display Variable'"; x.fillText(String(n), sx, 960);
        x.fillStyle = "rgba(255,249,240,.6)"; x.font = "700 34px 'Atkinson Hyperlegible Next Variable'"; x.fillText(k, sx + 4, 1060);
      });
      // jersey
      x.save(); x.translate(540 - 150, 1290); x.scale(7.5, 7.5);
      x.fillStyle = me.character.jersey.primary; x.fill(new Path2D(TANK));
      x.fillStyle = me.character.jersey.secondary; x.font = "800 17px 'Big Shoulders Display Variable'"; x.textAlign = "center"; x.fillText(me.character.jersey.number, 20, 26);
      x.restore();
      x.textAlign = "center"; x.fillStyle = "#FFF9F0"; x.font = "800 90px 'Big Shoulders Display Variable'"; x.fillText(me.nickname, 540, 1640);
      x.fillStyle = "rgba(255,249,240,.5)"; x.font = "600 30px 'Atkinson Hyperlegible Next Variable'"; x.fillText("Who's got next?  RUN IT demo card", 540, 1820);
      x.textAlign = "start";
      setUrl(cv.toDataURL("image/png"));
    });
    return () => { cancelled = true; };
  }, [rec, mine, c, me, run]);

  if (!rec || !mine) return null;

  const share = async () => {
    if (!canvas.current) return;
    const blob: Blob | null = await new Promise((r) => canvas.current!.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], `runit-${run.id}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], title: "My RUN IT game" }); setMsg("Shared."); } catch { /* user cancelled */ }
    } else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
      setMsg("Saved to your downloads.");
    }
  };

  return (
    <section className="mt-6" aria-labelledby="card-h">
      <h3 id="card-h" className="display text-[1.8rem]">Your game card</h3>
      <canvas ref={canvas} className="hidden" aria-hidden />
      {url ? (
        <div className="mt-3 flex flex-wrap items-end gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Game card: ${rec.result === "W" ? "win" : "loss"} ${rec.score} at ${c?.name}, ${mine.line.pts} points`} className="w-48 rounded-2xl shadow-[0_20px_40px_-20px_rgba(32,43,48,.6)]" />
          <div>
            <button className="btn-ball" onClick={share}>Share card</button>
            {msg && <p className="mt-2 text-sm text-ink-2" role="status">{msg}</p>}
            <p className="mt-2 max-w-[16rem] text-sm text-ink-2">Story-sized. Only what&apos;s on the card is shared.</p>
          </div>
        </div>
      ) : <p className="mt-2 text-sm text-ink-2">Drawing your card…</p>}
    </section>
  );
}
