"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { archetypeName } from "@/lib/archetypes";
import { ago, distLabel, miles, DEMO_HOME } from "@/lib/util";
import { RunRow, timeParts } from "@/components/RunRow";
import { Avatar } from "@/components/PlayerFigure";
import { CourtRun } from "@/components/CourtRun";
import { Empty } from "@/components/ui";
import { SpotPips } from "@/components/RunRow";

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
  const isMine = featured?.participants.includes(state.meId) ?? false;
  const here = featured ? featured.checkedIn.length : 0;
  const hasStarted = featured ? new Date(featured.startsAt).getTime() <= Date.now() : false;
  const runStatus = featured?.status === "final" ? "Final score posted"
    : featured?.status === "live" ? "Live now"
    : featured?.status === "checkin" || hasStarted ? "Check-in open"
    : featured && featured.participants.length >= featured.capacity ? "Run is full" : "Coming up";
  const actionLabel = featured?.status === "final" ? "Finish your game"
    : featured?.status === "live" ? "Open scoreboard"
    : featured?.checkedIn.includes(state.meId) ? "Open the run"
    : "Check in";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Your court starts here</p>
          <h1 className="display text-[clamp(3rem,7vw,5rem)]">Who&apos;s got next?</h1>
        </div>
        <Link href="/courts" className="text-sm font-bold text-ink underline decoration-2 underline-offset-4">Explore courts</Link>
      </div>

      {featured && fc && (
        <section className="grid items-center gap-6 overflow-hidden rounded-[28px] border border-paper-line bg-surface/70 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(260px,370px)] lg:gap-10" aria-labelledby="next-run">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-ball px-3 py-1 text-xs font-bold text-on-ball">{runStatus}</span>
              <span className="text-sm font-semibold text-ink-2">{isMine ? "Your run" : "Open run near you"}</span>
            </div>
            <h2 id="next-run" className="display mt-5 text-[clamp(2.4rem,5vw,4rem)]">{featured.title}</h2>
            <p className="mt-3 text-base text-ink-2 sm:text-lg">
              <span className="font-bold text-ink">{fc.name}</span> · {distLabel(fc)} · {featured.format} to {featured.target} · {featured.mode}
            </p>
            <p className="mt-2 text-sm text-ink-2">{startsIn(featured.startsAt)}{featured.visibility === "private" ? " · Invite only" : ""}</p>
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4 border-t border-ink/10 pt-5">
              <div><dt className="text-xs font-semibold text-ink-2">Tip-off</dt><dd className="num mt-1 text-2xl font-bold">{(() => { const t = timeParts(featured.startsAt); return `${t.t} ${t.ap.toUpperCase()}`; })()}</dd></div>
              <div><dt className="text-xs font-semibold text-ink-2">Spots</dt><dd className="mt-1 flex items-center gap-2"><span className="[&>span>span]:h-2.5 [&>span>span]:w-2.5"><SpotPips run={featured} /></span><span className="num text-xl font-bold">{featured.participants.length}/{featured.capacity}</span></dd></div>
              {isMine && <div><dt className="text-xs font-semibold text-ink-2">Checked in</dt><dd className="num mt-1 text-2xl font-bold">{here}</dd></div>}
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              {isMine ? (
                <Link href={`/runs/${featured.id}`} className="btn-ball px-7 py-3 text-base">{actionLabel}</Link>
              ) : featured.participants.length >= featured.capacity ? (
                <Link href={`/runs/${featured.id}`} className="btn-ball px-7 py-3 text-base">View run</Link>
              ) : (
                <button className="btn-ball px-7 py-3 text-base" onClick={() => dispatch({ type: "join", runId: featured.id })}>Take a spot</button>
              )}
              <Link href="/create" className="btn-line px-6 py-3 text-base">Call a run</Link>
            </div>
            {featured.requirement && <p className="mt-4 text-sm text-ink-2">House rules: {featured.requirement}</p>}
          </div>
          <div className="court-frame hidden md:block" aria-hidden="true">
            <CourtRun run={featured} labels={false} />
          </div>
        </section>
      )}

      <div className="mt-10 grid gap-x-14 gap-y-12 lg:grid-cols-[1fr_320px]">
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
