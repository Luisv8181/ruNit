"use client";

// Live scoreboard: one person keeps the game score, everyone keeps their own points.
// Big targets for sweaty hands, haptics on every tap, undo always one tap away.
// "Pocket mode" hides everything but the clock — the app gets out of the way.

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Run } from "@/lib/types";
import { tick, nudge } from "@/lib/feel";

export function LiveScoreboard({ run }: { run: Run }) {
  const { state, dispatch } = useStore();
  const t = state.tallies[run.id] ?? { a: 0, b: 0, mine: 0, log: [] };
  const [pocket, setPocket] = useState(false);
  const [entering, setEntering] = useState(false);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const mins = Math.floor((now - t0) / 60000), secs = Math.floor(((now - t0) / 1000) % 60);
  const onA = run.teams?.a.includes(state.meId);
  const mySide = onA ? "a" : "b";
  const add = (k: "a" | "b" | "mine", v: number) => {
    dispatch({ type: "tally", runId: run.id, k, v });
    // your own bucket also counts for your team
    if (k === "mine") dispatch({ type: "tally", runId: run.id, k: mySide, v });
    tick(v > 1);
  };
  const leader = t.a === t.b ? null : t.a > t.b ? "a" : "b";
  const atTarget = Math.max(t.a, t.b) >= run.target && Math.abs(t.a - t.b) >= (Math.max(t.a, t.b) > run.target ? 2 : 1);

  const open = () => { setA(String(t.a || "")); setB(String(t.b || "")); setEntering(true); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const x = parseInt(a, 10), y = parseInt(b, 10);
    if (isNaN(x) || isNaN(y) || x < 0 || y < 0) { nudge(); return setErr("Enter both scores."); }
    const hi = Math.max(x, y), lo = Math.min(x, y);
    if (hi === lo) { nudge(); return setErr("Pickup games don't end in a tie."); }
    if (hi < run.target) { nudge(); return setErr(`The winner needs at least ${run.target}.`); }
    if (hi > run.target && hi - lo !== 2) { nudge(); return setErr(`Past ${run.target}, a win-by-2 game ends exactly 2 apart.`); }
    dispatch({ type: "finalScore", runId: run.id, a: x, b: y });
  };

  const Side = ({ k, label }: { k: "a" | "b"; label: string }) => (
    <div className={`rounded-2xl p-4 transition-colors ${leader === k ? "bg-white/[.07] ring-1 ring-sun/40" : "bg-white/[.03]"}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-bold text-paper/80">{label}{(k === "a") === onA ? " (you)" : ""}</span>
        {leader === k && <span className="text-xs font-bold text-sun">Leading</span>}
      </div>
      <div className="num mt-1 text-center text-[96px] leading-none text-sun drop-shadow-[0_0_24px_rgba(244,198,94,.35)]" aria-live="polite">{t[k]}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[1, 2].map((v) => (
          <button key={v} aria-label={`Add ${v} for ${label}`} onClick={() => add(k, v)} className="num h-14 rounded-xl bg-paper text-[28px] text-ink active:scale-95">+{v}</button>
        ))}
      </div>
    </div>
  );

  if (pocket) {
    return (
      <div className="rounded-[26px] bg-ink p-8 text-center text-paper">
        <div className="display text-[3.4rem]">Phone down.<br /><span className="text-ball">Go hoop.</span></div>
        <div className="num mt-4 text-3xl text-paper/70">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</div>
        <div className="mt-8 flex justify-center gap-2">
          <button className="btn border-2 border-paper/30 text-paper" onClick={() => setPocket(false)}>Show scoreboard</button>
          <button className="btn-ball" onClick={() => { setPocket(false); open(); }}>Game over</button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[26px] bg-[radial-gradient(120%_90%_at_50%_0%,#33281f,#1b2326_65%)] p-4 text-paper sm:p-6">
      <div className="flex items-center justify-between px-1">
        <span className="num text-2xl text-paper/70">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
        <span className="text-[15px] text-paper/70">First to {run.target}</span>
        <button className="text-[15px] font-semibold text-paper underline decoration-paper/40 underline-offset-4" onClick={() => setPocket(true)}>Pocket mode</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Side k="a" label="Shirts" />
        <Side k="b" label="Skins" />
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[.04] p-4">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold">Your points</div>
          <div className="text-sm text-paper/60">Adds to your team too. Becomes your box score.</div>
        </div>
        <span className="num w-16 text-center text-[52px] leading-none">{t.mine}</span>
        {[1, 2].map((v) => (
          <button key={v} aria-label={`Add ${v} to my points`} onClick={() => add("mine", v)} className="num h-14 w-14 rounded-xl bg-ball text-[26px] text-ink active:scale-95">+{v}</button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button className="btn border-2 border-paper/25 text-paper disabled:opacity-30" disabled={!t.log.length} onClick={() => { dispatch({ type: "undoTally", runId: run.id }); tick(); }}>Undo last</button>
        {!entering && <button className={`btn px-7 py-3 ${atTarget ? "bg-sun text-ink" : "bg-paper text-ink"}`} onClick={open}>{atTarget ? `Game. ${t.a}–${t.b}. Save it` : "Game over"}</button>}
      </div>

      {entering && (
        <form onSubmit={submit} className="rise mt-4 rounded-2xl bg-paper p-5 text-ink">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div><label className="label" htmlFor="sa">Shirts</label><input id="sa" inputMode="numeric" className="field num text-center text-3xl" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ""))} /></div>
            <span className="pb-3 text-ink-3">–</span>
            <div><label className="label" htmlFor="sb">Skins</label><input id="sb" inputMode="numeric" className="field num text-center text-3xl" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ""))} /></div>
          </div>
          {err && <p className="mt-3 text-sm font-semibold text-[#b4441a]" role="alert">{err}</p>}
          <button className="btn-ink mt-4 w-full">Save final score</button>
          <p className="mt-2 text-center text-sm text-ink-2">Filled in from the scoreboard. Fix it if someone missed a bucket.</p>
        </form>
      )}
    </div>
  );
}
