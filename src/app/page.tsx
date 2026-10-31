"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { archetypeName } from "@/lib/archetypes";
import { ago, distLabel, miles, DEMO_HOME } from "@/lib/util";
import { RunRow, timeParts } from "@/components/RunRow";
import { Avatar } from "@/components/PlayerFigure";
import { CourtRun } from "@/components/CourtRun";
import { Empty } from "@/components/ui";
import { PlayerCard } from "@/components/PlayerCard";
import { SpotPips } from "@/components/RunRow";
import { useTheme } from "@/lib/theme";

function startsIn(iso: string) {
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (m <= -1) return `started ${-m} min ago`;
  if (m < 1) return "tips now";
  if (m < 60) return `tips in ${m} min`;
  const { t, ap, day } = timeParts(iso);
  return `${day.toLowerCase()} at ${t}${ap}`;
}

export default function Home() {
  const { state, court, dispatch } = useStore();
  const { theme } = useTheme();
  const mine = state.runs
    .filter((r) => r.participants.includes(state.meId) && r.status !== "reviewed")
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const next = mine[0];
  const open = state.runs
    .filter((r) => r.visibility === "public" && !r.participants.includes(state.meId) && ["open", "full"].includes(r.status))
    .sort((a, b) => (miles(DEMO_HOME, court(a.courtId)!) > 15 ? 1 : 0) - (miles(DEMO_HOME, court(b.courtId)!) > 15 ? 1 : 0) || +new Date(a.startsAt) - +new Date(b.startsAt));
  const featured = next ?? open[0];
  const fc = featured ? court(featured.courtId) : undefined;
  const free = state.players.filter((p) => p.availableNow && p.id !== state.meId && !state.blocked.includes(p.id));
  const courtsNear = [...state.courts].sort((a, b) => miles(DEMO_HOME, a) - miles(DEMO_HOME, b)).slice(0, 4);
  const featuredOpp = state.opportunities.find((o) => o.type === "Tournament");
  const isMine = featured && featured.participants.includes(state.meId);
  const here = featured ? featured.checkedIn.length : 0;

  return (
    <div>
      {theme === "card" && <div className="mb-8"><PlayerCard /></div>}
      <h1 className="display text-[clamp(3.2rem,9vw,6.5rem)]">Who&apos;s got next?</h1>

      {featured && fc && (
        <section className="mt-6 grid items-start gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,520px)_1fr]" aria-labelledby="next-run">
          <div className="court-frame">
            {isMine ? (
              <Link href={`/runs/${featured.id}`} aria-label={`Open ${featured.title}`} className="block rounded-[22px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/30">
                <CourtRun run={featured} />
              </Link>
            ) : (
              <CourtRun run={featured} onJoin={() => dispatch({ type: "join", runId: featured.id })} />
            )}
          </div>
          <div className="lg:pt-2">
            <p className="text-[15px] font-semibold text-ink-2">{isMine ? "Your next run" : "Closest open run"}</p>
            {(() => { const tp = timeParts(featured.startsAt); return (
              <div className="tip-time mt-2 flex items-end gap-2" aria-label={`Tips off ${tp.day.toLowerCase()} at ${tp.t} ${tp.ap}`}>
                <span className="score glow text-[clamp(5.2rem,13vw,8.5rem)]">{tp.t}</span>
                <span className="score pb-2 text-[clamp(1.6rem,4vw,2.4rem)]">{tp.ap.toUpperCase()}</span>
              </div>
            ); })()}
            <h2 id="next-run" className="display mt-3 text-[clamp(2.2rem,4.6vw,3.2rem)]">{featured.title}</h2>
            <p className="mt-3 max-w-md text-lg text-ink-2">
              {fc.name}, {startsIn(featured.startsAt)}. {featured.format === "1v1" ? "One on one" : `${featured.format.slice(0, 1)} on ${featured.format.slice(0, 1)}`}, first to {featured.target}{featured.mode === "ranked" ? ", ranked" : ""}.
            </p>
            <dl className="mt-6 flex gap-10">
              <div><dt className="text-sm text-ink-2">Spots taken</dt><dd className="mt-2 flex items-center gap-3"><span className="[&>span>span]:h-3.5 [&>span>span]:w-3.5 [&>span]:gap-1.5"><SpotPips run={featured} /></span><span className="num text-[28px] leading-none">{featured.participants.length}<span className="text-ink-3">/{featured.capacity}</span></span></dd></div>
              {isMine && <div><dt className="text-sm text-ink-2">At the court</dt><dd className="num text-[44px] leading-none">{here}</dd></div>}
            </dl>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {isMine ? (
                <Link href={`/runs/${featured.id}`} className="btn-ball px-7 py-3 text-base">{featured.checkedIn.includes(state.meId) ? "Open the run" : "Check in"}</Link>
              ) : (
                <button className="btn-ball px-7 py-3 text-base" onClick={() => dispatch({ type: "join", runId: featured.id })}>Take a spot</button>
              )}
              <Link href="/create" className="btn-line px-6 py-3 text-base">Call your own run</Link>
            </div>
            {featured.requirement && <p className="mt-6 max-w-md text-[15px] text-ink-2">House rules from the host: {featured.requirement}</p>}
          </div>
        </section>
      )}

      <div className="mt-16 grid gap-x-14 gap-y-12 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="open-runs">
          <div className="flex items-baseline justify-between">
            <h2 id="open-runs" className="display text-[2.4rem]">Open runs near you</h2>
            <Link href="/courts" className="text-[15px] font-semibold underline decoration-2 underline-offset-4">Map</Link>
          </div>
          {open.length ? (
            <ul className="mt-2">{open.filter((r) => r.id !== featured?.id || isMine).map((r) => <RunRow key={r.id} run={r} />)}</ul>
          ) : (
            <Empty title="Nobody's called a run yet" body="Pick a court and a time. Players nearby will see it." action={<Link href="/create" className="btn-ball">Call a run</Link>} />
          )}
          {mine.length > 1 && (
            <>
              <h2 className="display mt-12 text-[2.4rem]">Your other runs</h2>
              <ul className="mt-2">{mine.slice(1).map((r) => <RunRow key={r.id} run={r} />)}</ul>
            </>
          )}
        </section>

        <aside className="space-y-12">
          <section aria-labelledby="free-now">
            <h2 id="free-now" className="display text-[1.9rem]">Free to play now</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
              {free.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5">
                  <Avatar config={p.character} size={38} />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate font-bold">{p.nickname}</span>
                    <span className="block truncate text-[13px] text-ink-2">{archetypeName(p.dna, p.position)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="courts-near">
            <h2 id="courts-near" className="display text-[1.9rem]">Courts near you</h2>
            <ul className="mt-3">
              {courtsNear.map((c) => {
                const live = state.runs.filter((r) => r.courtId === c.id && !["final", "reviewed"].includes(r.status)).length;
                return (
                  <li key={c.id} className="border-t border-ink/10 first:border-0">
                    <Link href={`/courts?c=${c.id}`} className="flex items-center gap-3 py-3 hover:underline decoration-2 underline-offset-4">
                      <span className={`h-3 w-3 shrink-0 rounded-full ${c.indoor ? "bg-sun ring-2 ring-sun/40" : "bg-emerald"}`} aria-hidden />
                      <span className="flex-1 font-semibold">{c.name}</span>
                      <span className="text-sm text-ink-2">{live ? `${live} ${live === 1 ? "run" : "runs"}` : distLabel(c)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {featuredOpp && (
            <section aria-labelledby="coming-up">
              <h2 id="coming-up" className="display text-[1.9rem]">Coming up</h2>
              <Link href={`/opportunities?o=${featuredOpp.id}`} className="mt-3 block hover:underline decoration-2 underline-offset-4">
                <span className="block text-lg font-bold">{featuredOpp.title}</span>
                <span className="block text-[15px] text-ink-2">{new Date(featuredOpp.date).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}. {featuredOpp.spots} team spots left.</span>
              </Link>
            </section>
          )}

          <section aria-labelledby="activity">
            <h2 id="activity" className="display text-[1.9rem]">On the courts</h2>
            <ul className="mt-3 space-y-3">
              {state.activity.slice(0, 5).map((a) => (
                <li key={a.id} className="text-[15px] leading-snug">{a.text} <span className="whitespace-nowrap text-ink-3">{ago(a.at)}</span></li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
