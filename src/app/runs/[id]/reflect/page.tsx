"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { ScoringTag } from "@/lib/types";
import { ARCH, TAG_TO_ARCH } from "@/lib/archetypes";
import { ruleBasedProvider } from "@/lib/insights";
import { DNABars } from "@/components/ui";
import { I } from "@/components/icons";

const TAGS: ScoringTag[] = ["Drives", "Finishing through contact", "Post moves", "Mid-range", "Three-pointers", "Fast breaks", "Free throws", "Cuts", "Putbacks"];

const PROMPTS: { k: "strongest" | "difficult" | "learned" | "improve"; q: string; quick: string[] }[] = [
  { k: "strongest", q: "What felt strongest?", quick: ["First step", "Finishing", "Defense", "Passing", "Rebounding", "Shooting"] },
  { k: "difficult", q: "What was difficult?", quick: ["Weak hand", "Getting stops", "Turnovers", "Free throws", "Conditioning", "Spacing"] },
  { k: "learned", q: "What did you learn?", quick: [] },
  { k: "improve", q: "What do you want to work on?", quick: ["Weak-hand finishing", "Pull-up jumper", "On-ball defense", "Court vision", "Footwork"] },
];

export default function Reflect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, me, dispatch, court } = useStore();
  const game = state.history.find((h) => h.runId === id);
  const existing = state.reflections.find((r) => r.runId === id);
  const [tags, setTags] = useState<ScoringTag[]>(existing?.scoring ?? []);
  const [answers, setAnswers] = useState<Record<string, string>>({
    strongest: existing?.strongest ?? "", difficult: existing?.difficult ?? "", learned: existing?.learned ?? "", improve: existing?.improve ?? "",
  });
  const [stage, setStage] = useState<"how" | "more" | "done">(existing ? "done" : "how");
  const [before] = useState(me.dna);
  const insights = useMemo(() => ruleBasedProvider.generate({ history: state.history, reflections: state.reflections }), [state.history, state.reflections]);
  const log = state.dnaLog.find((l) => l.runId === id);

  if (!game) return <div className="py-20 text-center"><div className="display text-4xl">No saved game here yet</div><Link href={`/runs/${id}`} className="btn-ball mt-6">Back to the run</Link></div>;

  const save = () => {
    dispatch({ type: "reflect", reflection: { runId: id, date: new Date().toISOString(), scoring: tags, ...Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim())) } });
    setStage("done");
  };
  const toggle = (t: ScoringTag) => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/runs/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-ink"><I.Back width={16} height={16} />Game</Link>
        <span className="text-xs text-ink-3">{court(game.courtId)?.name}, {game.result} {game.score}, {game.line.pts} pts</span>
      </div>

      {stage === "how" && (
        <div className="rise">
          <div className="eyebrow">Reflection, optional, 30 seconds</div>
          <h1 className="display mt-2 text-[3.2rem] sm:text-[4.4rem]">How did you get your points today?</h1>
          <p className="mt-3 text-ink-2">Pick all that apply. This is the part of your game a box score can&apos;t see.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {TAGS.map((t) => {
              const on = tags.includes(t);
              const col = ARCH[TAG_TO_ARCH[t]].color;
              return (
                <button key={t} aria-pressed={on} onClick={() => toggle(t)} className="rounded-full border-2 px-4 py-2.5 text-[15px] font-semibold transition" style={on ? { background: col, borderColor: col, color: "#fff" } : { borderColor: "rgba(32,43,48,.12)", background: "rgba(255,255,255,.6)" }}>
                  {t}
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button className="btn-ghost" onClick={save}>Skip for now</button>
            <div className="flex gap-2">
              <button className="btn-line" disabled={!tags.length} onClick={save}>Just save this</button>
              <button className="btn-ball" disabled={!tags.length} onClick={() => setStage("more")}>A few more <I.Chevron width={14} height={14} /></button>
            </div>
          </div>
        </div>
      )}

      {stage === "more" && (
        <div className="rise space-y-6">
          <div>
            <div className="eyebrow">Still optional</div>
            <h1 className="display mt-2 text-[2.8rem]">Talk it through</h1>
          </div>
          {PROMPTS.map((p) => (
            <div key={p.k}>
              <label className="label" htmlFor={p.k}>{p.q}</label>
              {p.quick.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {p.quick.map((q) => <button type="button" key={q} className={`chip ${answers[p.k] === q ? "chip-on" : ""}`} onClick={() => setAnswers((a) => ({ ...a, [p.k]: a[p.k] === q ? "" : q }))}>{q}</button>)}
                </div>
              )}
              <input id={p.k} className="field" maxLength={140} value={answers[p.k]} onChange={(e) => setAnswers((a) => ({ ...a, [p.k]: e.target.value }))} placeholder="In your own words…" />
            </div>
          ))}
          <div className="flex justify-between"><button className="btn-ghost" onClick={() => setStage("how")}>Back</button><button className="btn-ball px-8" onClick={save}>Save reflection</button></div>
        </div>
      )}

      {stage === "done" && (
        <div className="rise space-y-6">
          <div>
            <div className="eyebrow">Saved</div>
            <h1 className="display mt-2 text-[3rem]">Here&apos;s what moved</h1>
          </div>
          <div className="rounded-[22px] bg-ink p-6 text-paper">
            <div className="eyebrow !text-sun mb-4">Player DNA, {me.nickname}</div>
            <DNABars dna={me.dna} dark />
            {log ? (
              <ul className="mt-5 space-y-1 border-t border-paper/10 pt-4 text-sm text-paper/80">
                {log.reasons.map((r) => <li key={r} className="flex items-center gap-2"><I.Spark width={14} height={14} className="text-sun" />{r}</li>)}
              </ul>
            ) : (
              <p className="mt-5 border-t border-paper/10 pt-4 text-sm text-paper/60">No change from this game. One game moves a trait by at most 3 points — DNA reflects patterns, not a single night.</p>
            )}
            {JSON.stringify(before) !== JSON.stringify(me.dna) && <p className="mt-2 text-[11px] text-paper/40">DNA is built from your reflections and confirmed stats. It describes how you play — it isn&apos;t a rating.</p>}
          </div>
          {insights[0] && (
            <div className="panel pt-5">
              <div className="flex items-center gap-2"><I.Bulb className="text-ball" /><span className="eyebrow !text-ball">{insights[0].confidence}</span></div>
              <div className="mt-2 text-lg font-bold">{insights[0].headline}</div>
              <p className="mt-1 text-ink-2">{insights[0].body}</p>
              {insights[0].suggestion && <p className="mt-3 rounded-xl bg-ball/[.07] p-3 text-sm">{insights[0].suggestion}</p>}
              <p className="mt-3 text-[11px] text-ink-3">Based on: {insights[0].evidence}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2"><Link href="/my-game" className="btn-ball">Open My Game</Link><Link href="/" className="btn-line">Find the next run</Link></div>
        </div>
      )}
    </div>
  );
}
