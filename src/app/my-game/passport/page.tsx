"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { badges, passport, type Stamp } from "@/lib/records";
import type { Court } from "@/lib/types";
import { BackLink } from "@/components/ui";
import { I } from "@/components/icons";

const INK: Record<string, string> = { Hazleton: "#C4521A", Scranton: "#1D6F96" };
const area = (c: Court) => (["Hazleton", "West Hazleton"].includes(c.city) ? "Hazleton" : "Scranton");
const tilt = (id: string) => ([...id].reduce((t, ch) => t + ch.charCodeAt(0), 0) % 17) - 8;

function StampMark({ court, stamp }: { court: Court; stamp: Stamp }) {
  const won = stamp.status === "won";
  const ink = INK[area(court)];
  const id = `arc-${court.id}`;
  const date = stamp.firstWin ? new Date(stamp.firstWin).toLocaleDateString([], { month: "short", day: "numeric" }) : "";
  return (
    <Link href={`/courts?c=${court.id}`} className="group block text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded-full" aria-label={`${court.name}: ${won ? `won, first win ${date}` : stamp.status === "played" ? "played, no win yet" : "not played yet"}`}>
      <svg viewBox="0 0 160 160" className="mx-auto w-full max-w-[170px]" style={{ transform: won ? `rotate(${tilt(court.id)}deg)` : undefined }} aria-hidden>
        <defs><path id={id} d="M24 80a56 56 0 0 1 112 0" /></defs>
        {won ? (
          <g fill="none" stroke={ink} opacity=".9">
            <circle cx="80" cy="80" r="74" strokeWidth="4" />
            <circle cx="80" cy="80" r="66" strokeWidth="1.5" />
            <circle cx="80" cy="80" r="40" strokeWidth="1.5" />
            <text fill={ink} stroke="none" fontSize="13" fontWeight="700" letterSpacing="1"><textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{court.name}</textPath></text>
            <text x="80" y="88" fill={ink} stroke="none" textAnchor="middle" fontSize="30" style={{ fontFamily: "'Big Shoulders Display Variable'", fontWeight: 900 }}>W</text>
            <text x="80" y="134" fill={ink} stroke="none" textAnchor="middle" fontSize="13" fontWeight="700">{date}</text>
            <text x="80" y="104" fill={ink} stroke="none" textAnchor="middle" fontSize="10.5" fontWeight="700">{stamp.wins} {stamp.wins === 1 ? "win" : "wins"}</text>
          </g>
        ) : (
          <g fill="none" stroke="#202B30" strokeOpacity=".28">
            <circle cx="80" cy="80" r="74" strokeWidth="2" strokeDasharray="6 7" />
            <text fill="#5d6a70" stroke="none" fontSize="13" fontWeight="600"><textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{court.name}</textPath></text>
            <text x="80" y="90" fill="#5d6a70" stroke="none" textAnchor="middle" fontSize="14" fontWeight="600">{stamp.status === "played" ? "Played" : "Open"}</text>
          </g>
        )}
      </svg>
      <span className="mt-1 block text-sm text-ink-2 group-hover:underline">{won ? `First win ${date}` : stamp.status === "played" ? `${stamp.games} ${stamp.games === 1 ? "game" : "games"}, no win yet` : "Not played yet"}</span>
    </Link>
  );
}

export default function Passport() {
  const { state } = useStore();
  const stamps = useMemo(() => passport(state.meId, state.courts, state.courtGames), [state]);
  const list = useMemo(() => badges(state.meId, state.courts, state.courtGames), [state]);
  const won = stamps.filter((s) => s.status === "won").length;
  const areas = ["Hazleton", "Scranton"];

  return (
    <div>
      <BackLink href="/my-game" label="My Game" />
      <h1 className="display text-[clamp(3rem,8vw,5.5rem)]">Court passport</h1>
      <p className="mt-3 max-w-xl text-lg text-ink-2">Win a confirmed game at a court and it gets stamped. Losses still count as visits, and only games the other team confirms earn a stamp.</p>

      <div className="mt-8 flex flex-wrap items-end gap-x-12 gap-y-4">
        <div><div className="num text-[72px] leading-none">{won}<span className="text-ink-3">/{state.courts.length}</span></div><div className="text-[15px] text-ink-2">courts won in Pennsylvania</div></div>
        <div><div className="num text-[72px] leading-none">{stamps.filter((s) => s.status !== "none").length}</div><div className="text-[15px] text-ink-2">courts played</div></div>
      </div>

      {areas.map((a) => {
        const courts = state.courts.filter((c) => area(c) === a);
        const got = courts.filter((c) => stamps.find((s) => s.courtId === c.id)?.status === "won").length;
        return (
          <section key={a} className="mt-12" aria-labelledby={`area-${a}`}>
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
              <h2 id={`area-${a}`} className="display text-[2.2rem]">{a} area</h2>
              <span className="text-[15px] text-ink-2">{got} of {courts.length} won</span>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {courts.map((c) => <li key={c.id}><StampMark court={c} stamp={stamps.find((s) => s.courtId === c.id)!} /></li>)}
            </ul>
          </section>
        );
      })}

      <section className="mt-16" aria-labelledby="badges">
        <h2 id="badges" className="display border-b-2 border-ink pb-2 text-[2.2rem]">Badges</h2>
        <ul>
          {list.map((b) => (
            <li key={b.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-4 border-b border-ink/10 py-4">
              <span className={`grid h-9 w-9 place-items-center rounded-full ${b.earned ? "bg-ball text-ink" : "border-2 border-dashed border-ink/25 text-ink-3"}`}>{b.earned ? <I.Check width={18} height={18} /> : null}</span>
              <div>
                <div className={`text-[17px] font-bold ${b.earned ? "" : "text-ink-2"}`}>{b.name}</div>
                <div className="text-[15px] text-ink-2">{b.how}</div>
              </div>
              {b.progress && !b.earned ? (
                <div className="w-28 text-right">
                  <div className="num text-xl">{b.progress[0]}<span className="text-ink-3">/{b.progress[1]}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-ink/10"><div className="h-full rounded-full bg-ink" style={{ width: `${(b.progress[0] / b.progress[1]) * 100}%` }} /></div>
                </div>
              ) : <span className="text-[15px] font-semibold text-emerald">{b.earned ? "Earned" : ""}</span>}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 max-w-xl text-sm text-ink-2">This demo maps 9 made-up courts. The full version stamps every mapped court in your state, starting from open map data that players confirm one court at a time.</p>
    </div>
  );
}
