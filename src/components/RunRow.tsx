"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import type { Run } from "@/lib/types";
import { distLabel } from "@/lib/util";
import { Avatar } from "./PlayerFigure";
import { I } from "./icons";

export function timeParts(iso: string) {
  const d = new Date(iso);
  const t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?(AM|PM)/i, "");
  const ap = d.getHours() >= 12 ? "PM" : "AM";
  const today = new Date().toDateString() === d.toDateString();
  const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
  const day = today ? "Today" : tmr.toDateString() === d.toDateString() ? "Tmrw" : d.toLocaleDateString([], { weekday: "short" });
  return { t, ap, day };
}

export function RunRow({ run, showCourt = true }: { run: Run; showCourt?: boolean }) {
  const { state, court, player, dispatch } = useStore();
  const c = court(run.courtId)!;
  const mine = run.participants.includes(state.meId);
  const open = run.capacity - run.participants.length;
  const { t, ap, day } = timeParts(run.startsAt);
  return (
    <div className="group relative grid grid-cols-[64px_1fr] items-center gap-4 border-b border-paper-line py-4 last:border-0 sm:grid-cols-[76px_1fr_auto]">
      <div className="text-center">
        <div className="eyebrow !text-[10px]">{day}</div>
        <div className="num text-[22px] font-bold leading-tight">{t}</div>
        <div className="num text-[10px] text-ink-3">{ap}</div>
      </div>
      <div className="min-w-0">
        <Link href={`/runs/${run.id}`} className="block after:absolute after:inset-0 after:content-['']">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{run.title}</span>
            {run.mode === "ranked" && <span className="rounded bg-ink px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-paper">Ranked</span>}
          </div>
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
          <span className="font-semibold text-ink">{run.format} · to {run.target}</span>
          {showCourt && <span className="inline-flex items-center gap-1"><I.Pin width={14} height={14} />{c.name} · {distLabel(c)}</span>}
          {run.recurring && <span className="inline-flex items-center gap-1"><I.Clock width={14} height={14} />{run.recurring}</span>}
        </div>
        <div className="mt-2.5 flex items-center gap-3 sm:hidden">
          <Roster run={run} />
        </div>
      </div>
      <div className="relative z-10 col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:justify-end">
        <div className="hidden sm:block"><Roster run={run} /></div>
        {mine ? (
          <Link href={`/runs/${run.id}`} className="btn-line ml-auto py-2 sm:ml-0">You&apos;re in <I.Chevron width={14} height={14} /></Link>
        ) : open > 0 ? (
          <button className="btn-ball ml-auto py-2 sm:ml-0" onClick={() => dispatch({ type: "join", runId: run.id })}>
            Join · {open} {open === 1 ? "spot" : "spots"}
          </button>
        ) : (
          <span className="ml-auto text-sm font-semibold text-ink-3">Full · next</span>
        )}
      </div>
      <span className="sr-only">{player(run.hostId)?.nickname} is hosting</span>
    </div>
  );
}

export function Roster({ run, size = 26 }: { run: Run; size?: number }) {
  const { player } = useStore();
  const shown = run.participants.slice(0, 6);
  const empty = Math.max(0, Math.min(6, run.capacity) - shown.length);
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((id) => {
          const p = player(id);
          return p ? <span key={id} title={p.nickname} className="rounded-full ring-2 ring-paper"><Avatar config={p.character} size={size} ring={false} /></span> : null;
        })}
        {Array.from({ length: empty }).map((_, i) => (
          <span key={i} className="rounded-full border-2 border-dashed border-ink/20 bg-paper" style={{ width: size, height: size }} />
        ))}
      </div>
      <span className="num ml-2 text-xs text-ink-2">{run.participants.length}/{run.capacity}</span>
    </div>
  );
}
