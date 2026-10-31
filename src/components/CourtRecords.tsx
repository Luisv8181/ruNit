"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { courtRecords } from "@/lib/records";
import { Avatar } from "./PlayerFigure";

export function CourtRecords({ courtId }: { courtId: string }) {
  const { state, player } = useStore();
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

  const rows: { label: string; holder?: { id: string; value: number }; unit: string; extra?: string }[] = [
    { label: "Longest win streak", holder: r.longestStreak, unit: "straight wins" },
    { label: "Most points in a game", holder: r.bestGame, unit: "points" },
    { label: "Biggest 1 on 1 win", holder: r.biggestWin, unit: "point margin", extra: r.biggestWin ? `, ${r.biggestWin.score}` : "" },
    { label: "Most games played", holder: r.regular, unit: "games" },
  ];

  return (
    <section className="mt-8" aria-labelledby={`rec-${courtId}`}>
      <h3 id={`rec-${courtId}`} className="display text-[1.8rem]">Court records</h3>

      {king && r.mostWins && (
        <div className="mt-3 flex items-center gap-4 rounded-xl bg-ink p-4 text-paper">
          <span className="flex -space-x-3">{tied.slice(0, 3).map((h) => { const p = player(h.id); return p ? <Avatar key={h.id} config={p.character} size={52} /> : null; })}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-paper/70">{tied.length > 1 ? "Tied for most wins here" : "Most wins here"}</div>
            <div className="display text-[2rem] leading-none">{kingName}</div>
          </div>
          <div className="text-right">
            <div className="num text-[44px] leading-none text-sun">{r.mostWins.value}</div>
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

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        {rows.filter((x) => x.holder).map((x) => (
          <div key={x.label}>
            <dt className="text-sm text-ink-2">{x.label}</dt>
            <dd className="mt-0.5"><span className="num text-[28px] leading-none">{x.holder!.value}</span> <span className="text-[15px]">{x.holder!.id === state.meId ? "You" : player(x.holder!.id)?.nickname}{x.extra}</span></dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 text-sm text-ink-2">
        Counted from {r.confirmed} opponent-confirmed games.{r.unconfirmed ? ` ${r.unconfirmed} other games here weren't confirmed by the other team, so they don't count.` : ""}{" "}
        <Link href="/my-game/passport" className="font-semibold text-ink underline decoration-2 underline-offset-4">Your court passport</Link>
      </p>
    </section>
  );
}
