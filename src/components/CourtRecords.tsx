"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { courtRecords } from "@/lib/records";
import { Avatar } from "./PlayerFigure";
import { useTheme } from "@/lib/theme";

type Rec = { label: string; holder?: { id: string; value: number }; unit: string; extra?: string };

/** Paint look: the record book drawn on a half court, each record a sticker where it was earned. */
function HalfCourtBook({ rows, name }: { rows: Rec[]; name: (id: string) => string }) {
  const spots = [
    { left: "50%", top: "16%", tone: "bg-chalk text-night" },   // in the paint
    { left: "50%", top: "52%", tone: "bg-sun text-night" },     // top of the key
    { left: "26%", top: "80%", tone: "bg-sky text-night" },     // left wing
    { left: "74%", top: "80%", tone: "bg-chalk text-night" },   // right wing
  ];
  return (
    <div className="relative mt-5 aspect-[358/336] w-full max-w-[460px] overflow-hidden rounded-2xl" role="list" aria-label="Court records">
      <svg viewBox="0 0 358 336" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect width="358" height="336" style={{ fill: "var(--court-out-floor)" }} />
        <rect x="121.7" y="0" width="114.6" height="136" style={{ fill: "var(--court-key)" }} />
        <g fill="none" style={{ stroke: "var(--court-line-out)" }} strokeWidth="2.5">
          <rect x="121.7" y="0" width="114.6" height="136" />
          <circle cx="179" cy="136" r="43" />
          <path d="M21.5 0V101.6A170 170 0 0 0 336.5 101.6V0" />
          <path d="M136 336A43 43 0 0 1 222 336" />
          <path d="M158 28H200" />
          <circle cx="179" cy="37.6" r="6" />
        </g>
      </svg>
      {rows.filter((r) => r.holder).slice(0, 4).map((r, i) => (
        <div key={r.label} role="listitem" className={`sticker absolute w-[42%] max-w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] px-2 py-1.5 text-center ${spots[i].tone}`} style={{ left: spots[i].left, top: spots[i].top }}>
          <div className="text-[11px] font-bold leading-tight">{r.label}</div>
          <div className="score text-[30px]">{r.holder!.value}</div>
          <div className="text-[13px] font-bold leading-tight">{name(r.holder!.id)}{r.extra}</div>
        </div>
      ))}
    </div>
  );
}

export function CourtRecords({ courtId }: { courtId: string }) {
  const { state, player } = useStore();
  const { theme } = useTheme();
  const r = useMemo(() => courtRecords(courtId, state.courtGames), [courtId, state.courtGames]);
  const king = r.mostWins ? player(r.mostWins.id) : undefined;
  const mine = r.winsTable.find((h) => h.id === state.meId)?.value ?? 0;
  const tied = r.winsTable.filter((h) => h.value === r.mostWins?.value);
  const iAmKing = tied.some((h) => h.id === state.meId);
  const kingName = tied.map((h) => (h.id === state.meId ? "You" : player(h.id)?.nickname)).join(" & ");

  if (!r.confirmed) {
    return (
      <section className="mt-8">
        <h3 className="display text-[1.8rem]">Court records</h3>
        <p className="mt-2 text-[15px] text-ink-2">No confirmed games here yet. The first confirmed win here sets every record.</p>
      </section>
    );
  }

  const rows: Rec[] = [
    { label: "Longest win streak", holder: r.longestStreak, unit: "straight wins" },
    { label: "Most points in a game", holder: r.bestGame, unit: "points" },
    { label: "Biggest 1 on 1 win", holder: r.biggestWin, unit: "point margin", extra: r.biggestWin ? `, ${r.biggestWin.score}` : "" },
    { label: "Most games played", holder: r.regular, unit: "games" },
  ];

  return (
    <section className="mt-8" aria-labelledby={`rec-${courtId}`}>
      <h3 id={`rec-${courtId}`} className="display text-[1.8rem]">Court records</h3>

      {king && r.mostWins && (
        <div className="scope-night sticker mt-3 flex items-center gap-4 rounded-xl bg-ink p-4 text-paper">
          <span className="flex -space-x-3">{tied.slice(0, 3).map((h) => { const p = player(h.id); return p ? <Avatar key={h.id} config={p.character} size={52} /> : null; })}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-paper/70">{tied.length > 1 ? "Tied for most wins here" : "Most wins here"}</div>
            <div className="display text-[2rem] leading-none">{kingName}</div>
          </div>
          <div className="text-right">
            <div className="score glow text-[48px] leading-none text-ball">{r.mostWins.value}</div>
            <div className="text-sm text-paper/70">{tied.length > 1 ? "wins each" : "wins"}</div>
          </div>
        </div>
      )}
      {!iAmKing && r.mostWins && (
        <p className="mt-3 text-[15px]">
          {mine > 0 ? <>You have <b>{mine}</b> {mine === 1 ? "win" : "wins"} here. <b>{r.mostWins.value - mine + 1} more</b> {r.mostWins.value - mine + 1 === 1 ? "takes" : "take"} the record outright.</> : <>You haven&apos;t won here yet. Win once to put this court in your passport.</>}
        </p>
      )}

      <ol className="mt-4">
        {r.winsTable.slice(0, 5).map((h, i) => {
          const p = player(h.id);
          if (!p) return null;
          const me = h.id === state.meId;
          return (
            <li key={h.id} className={`grid grid-cols-[28px_32px_1fr_auto] items-center gap-3 border-t border-ink/10 py-2.5 ${me ? "font-bold" : ""}`}>
              <span className="num text-xl text-ink-2">{i + 1}</span>
              <Avatar config={p.character} size={30} />
              <span>{me ? "You" : p.nickname}</span>
              <span className="num text-xl">{h.value}</span>
            </li>
          );
        })}
        {mine > 0 && !r.winsTable.slice(0, 5).some((h) => h.id === state.meId) && (
          <li className="grid grid-cols-[28px_32px_1fr_auto] items-center gap-3 border-t border-ink/10 py-2.5 font-bold">
            <span className="num text-xl text-ink-2">{r.winsTable.findIndex((h) => h.id === state.meId) + 1}</span>
            <span />
            <span>You</span>
            <span className="num text-xl">{mine}</span>
          </li>
        )}
      </ol>

      {theme === "paint" ? <HalfCourtBook rows={rows} name={(id) => (id === state.meId ? "You" : player(id)?.nickname ?? "")} /> : (
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        {rows.filter((x) => x.holder).map((x) => (
          <div key={x.label}>
            <dt className="text-sm text-ink-2">{x.label}</dt>
            <dd className="mt-0.5"><span className="score text-[32px] text-ball-ink">{x.holder!.value}</span> <span className="text-[15px]">{x.holder!.id === state.meId ? "You" : player(x.holder!.id)?.nickname}{x.extra}</span></dd>
          </div>
        ))}
      </dl>
      )}

      <p className="mt-5 text-sm text-ink-2">
        Counted from {r.confirmed} opponent-confirmed games.{r.unconfirmed ? ` ${r.unconfirmed} other games here weren't confirmed by the other team, so they don't count.` : ""}{" "}
        <Link href="/my-game/passport" className="font-semibold text-ink underline decoration-2 underline-offset-4">Your court passport</Link>
      </p>
    </section>
  );
}
