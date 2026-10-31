"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import type { Run } from "@/lib/types";
import { distLabel } from "@/lib/util";
import { Avatar } from "./PlayerFigure";

export function timeParts(iso: string) {
  const d = new Date(iso);
  const t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?(AM|PM)/i, "");
  const ap = d.getHours() >= 12 ? "pm" : "am";
  const today = new Date().toDateString() === d.toDateString();
  const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
  const day = today ? "Today" : tmr.toDateString() === d.toDateString() ? "Tomorrow" : d.toLocaleDateString([], { weekday: "long" });
  return { t, ap, day };
}

const FORMAT_WORD: Record<string, string> = { "1v1": "1 on 1", "2v2": "2s", "3v3": "3s", "5v5": "5s" };

/** Spot pips: one per spot, filled when taken. Reads like the open slots on a sign-up sheet. */
export function SpotPips({ run }: { run: Run }) {
  const shown = Math.min(run.capacity, 10);
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`${run.participants.length} of ${run.capacity} spots taken`}>
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < run.participants.length ? "bg-ink" : "border-2 border-ink/25"}`} />
      ))}
    </span>
  );
}

export function RunRow({ run, showCourt = true }: { run: Run; showCourt?: boolean }) {
  const { state, court, dispatch } = useStore();
  const c = court(run.courtId)!;
  const mine = run.participants.includes(state.meId);
  const open = run.capacity - run.participants.length;
  const { t, ap, day } = timeParts(run.startsAt);
  return (
    <li className="group relative grid grid-cols-[72px_1fr_auto] items-center gap-x-4 gap-y-2 border-t border-ink/10 py-4 first:border-t-0">
      <div className="leading-none">
        <div className="text-[13px] font-semibold text-ink-2">{day}</div>
        <div className="num mt-1 text-[30px] leading-none">{t}<span className="ml-0.5 text-base text-ink-2">{ap}</span></div>
      </div>
      <div className="min-w-0">
        <Link href={`/runs/${run.id}`} className="block text-[17px] font-bold leading-snug after:absolute after:inset-0 after:content-[''] hover:underline decoration-2 underline-offset-4">
          {run.title}
        </Link>
        <div className="mt-0.5 text-[15px] leading-snug text-ink-2">
          {showCourt && <>{c.name}, {distLabel(c)}. </>}
          {FORMAT_WORD[run.format]} to {run.target}{run.mode === "ranked" ? ", ranked" : ""}.
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-end gap-2">
        {mine ? (
          <Link href={`/runs/${run.id}`} className="text-[15px] font-bold text-ink underline decoration-2 underline-offset-4">You&apos;re in</Link>
        ) : open > 0 ? (
          <button className="btn-ball px-4 py-2" onClick={() => dispatch({ type: "join", runId: run.id })}>
            Join
          </button>
        ) : (
          <span className="text-[15px] font-semibold text-ink-3">Full</span>
        )}
        <SpotPips run={run} />
      </div>
    </li>
  );
}

export function Roster({ run, size = 26 }: { run: Run; size?: number }) {
  const { player } = useStore();
  return (
    <div className="flex items-center gap-1">
      {run.participants.slice(0, 6).map((id) => {
        const p = player(id);
        return p ? <span key={id} title={p.nickname}><Avatar config={p.character} size={size} /></span> : null;
      })}
      <span className="num ml-1 text-sm text-ink-2">{run.participants.length}/{run.capacity}</span>
    </div>
  );
}
