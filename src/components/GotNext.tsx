"use client";

// The "got next" line at a court: who's waiting, in what order, and how big each group is.
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ago } from "@/lib/util";
import { Avatar } from "./PlayerFigure";
import { DemoTag } from "./ui";
import { tick, swish } from "@/lib/feel";

export function GotNext({ courtId }: { courtId: string }) {
  const { state, dispatch, player } = useStore();
  const q = state.queues[courtId] ?? [];
  const mineIdx = q.findIndex((e) => e.playerId === state.meId);
  const [size, setSize] = useState(1);
  return (
    <section className="mt-8" aria-labelledby={`next-${courtId}`}>
      <div className="flex items-baseline justify-between">
        <h3 id={`next-${courtId}`} className="display text-[1.8rem]">Got next</h3>
        <span className="text-sm text-ink-2">{q.length ? `${q.length} ${q.length === 1 ? "group" : "groups"} waiting` : "Nobody waiting"}</span>
      </div>
      {q.length > 0 && (
        <ol className="mt-2">
          {q.map((e, i) => {
            const p = player(e.playerId);
            if (!p) return null;
            const me = e.playerId === state.meId;
            return (
              <li key={e.id} className={`grid grid-cols-[28px_32px_1fr_auto] items-center gap-3 border-t border-ink/10 py-2.5 ${me ? "font-bold" : ""}`}>
                <span className="num text-xl text-ink-2">{i + 1}</span>
                <Avatar config={p.character} size={30} />
                <span>{me ? "You" : p.nickname}{e.size > 1 ? ` + ${e.size - 1}` : ""}</span>
                <span className="text-sm font-normal text-ink-2">{ago(e.at)}</span>
              </li>
            );
          })}
        </ol>
      )}
      {mineIdx >= 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sun-soft/70 p-3">
          <span className="text-[15px]">{mineIdx === 0 ? <b>You&apos;re up next.</b> : <>You&apos;re <b>{mineIdx + 1}{["st", "nd", "rd"][mineIdx] ?? "th"}</b> in line. We&apos;ll buzz you when you&apos;re up.</>}</span>
          <button className="btn-ghost px-2 text-warn" onClick={() => dispatch({ type: "queueLeave", courtId })}>Leave the line</button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border-2 border-ink/15" role="group" aria-label="Group size">
            <button className="h-10 w-10 text-lg font-bold disabled:opacity-30" disabled={size <= 1} onClick={() => setSize((n) => n - 1)} aria-label="Fewer players">−</button>
            <span className="num w-20 text-center text-lg">{size === 1 ? "Just me" : `Me + ${size - 1}`}</span>
            <button className="h-10 w-10 text-lg font-bold disabled:opacity-30" disabled={size >= 5} onClick={() => setSize((n) => n + 1)} aria-label="More players">+</button>
          </div>
          <button className="btn-ball" onClick={() => { dispatch({ type: "queueJoin", courtId, size }); tick(true); }}>Put my name down</button>
        </div>
      )}
      {q.length > 0 && (
        <button className="btn-line mt-3 py-1.5 text-sm" onClick={() => { if (q[0]?.playerId === state.meId) swish(); dispatch({ type: "queueAdvance", courtId }); }}>
          <DemoTag>Demo</DemoTag> Game ends, next group up
        </button>
      )}
    </section>
  );
}
