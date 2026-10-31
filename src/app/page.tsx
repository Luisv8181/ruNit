"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { archetypeName, ARCH, earnedArchetypes } from "@/lib/archetypes";
import { ago, distLabel, miles, DEMO_HOME, when } from "@/lib/util";
import { RunRow } from "@/components/RunRow";
import { Avatar, PlayerFigure } from "@/components/PlayerFigure";
import { CourtArt, CourtBadge, Empty } from "@/components/ui";
import { I } from "@/components/icons";

export default function Home() {
  const { state, me, court } = useStore();
  const upcoming = state.runs
    .filter((r) => r.participants.includes(state.meId) && r.status !== "reviewed")
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const next = upcoming[0];
  const nearby = state.runs
    .filter((r) => r.visibility === "public" && !r.participants.includes(state.meId) && ["open", "full"].includes(r.status))
    .sort((a, b) => (miles(DEMO_HOME, court(a.courtId)!) > 15 ? 1 : 0) - (miles(DEMO_HOME, court(b.courtId)!) > 15 ? 1 : 0) || +new Date(a.startsAt) - +new Date(b.startsAt));
  const tonight = nearby.filter((r) => +new Date(r.startsAt) - Date.now() < 12 * 3600e3).length;
  const avail = state.players.filter((p) => p.availableNow && p.id !== state.meId && !state.blocked.includes(p.id));
  const courtsNear = [...state.courts].sort((a, b) => miles(DEMO_HOME, a) - miles(DEMO_HOME, b)).slice(0, 4);
  const featured = state.opportunities.find((o) => o.type === "Tournament");

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFE7C2] via-[#FFD39A] to-[#F9A866] px-6 pb-7 pt-8 sm:px-10 sm:pt-12">
        <CourtArt className="pointer-events-none absolute -right-24 -top-10 h-[520px] w-auto rotate-[8deg]" stroke="#7a3d12" opacity={0.16} />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-white/30 blur-3xl" />
        <div className="relative grid grid-cols-1 items-end gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="eyebrow !text-[#8a4a1c]">Hazleton · Tonight</div>
            <h1 className="display mt-3 text-[clamp(3.6rem,13vw,8.5rem)] text-ink">Who&apos;s got<br />next?</h1>
            <p className="mt-4 max-w-md text-[15px] text-ink/80">
              <b className="text-ink">{tonight} runs</b> calling for players near you tonight. <b className="text-ink">{avail.length} hoopers</b> say they&apos;re free right now.
            </p>
            {next ? (
              <Link href={`/runs/${next.id}`} className="group mt-6 flex w-full max-w-xl min-w-0 items-center gap-4 rounded-2xl bg-ink p-4 pr-5 text-paper shadow-[0_20px_40px_-20px_rgba(32,43,48,.8)] transition hover:-translate-y-0.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ball"><I.Ball className="text-white" /></span>
                <span className="min-w-0 flex-1">
                  <span className="eyebrow !text-sun">You&apos;re up</span>
                  <span className="block truncate font-semibold">{next.title} · {court(next.courtId)?.name}</span>
                  <span className="block text-[13px] text-paper/70">{when(next.startsAt)} · {next.checkedIn.length}/{next.capacity} checked in</span>
                </span>
                <span className="hidden items-center gap-1 text-sm font-semibold text-sun sm:flex">{next.checkedIn.includes(state.meId) ? "Open" : "Check in"} <I.Chevron width={16} height={16} /></span>
              </Link>
            ) : (
              <Link href="/create" className="btn-ink mt-6">Call a run</Link>
            )}
          </div>
          <div className="relative hidden md:block">
            <PlayerFigure config={me.character} size={210} idSuffix="hero" />
            <div className="absolute -left-10 bottom-10 rounded-xl bg-paper/90 px-3 py-2 shadow">
              <div className="eyebrow !text-[9px]">{me.nickname}</div>
              <div className="text-sm font-bold" style={{ color: ARCH[earnedArchetypes(me.dna)[0]].color }}>{archetypeName(me.dna, me.position)}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <section>
            <div className="mb-2 flex items-end justify-between">
              <h2 className="display text-[2.2rem]">Runs near you</h2>
              <Link href="/courts" className="text-sm font-semibold text-ball">See map</Link>
            </div>
            {nearby.length ? (
              <div className="panel px-4 sm:px-5">{nearby.map((r) => <RunRow key={r.id} run={r} />)}</div>
            ) : (
              <Empty title="No open runs" body="Nobody's called one yet. Be the one." action={<Link href="/create" className="btn-ball">Create a run</Link>} />
            )}
          </section>

          {upcoming.length > 1 && (
            <section>
              <h2 className="display mb-2 text-[2.2rem]">Your games</h2>
              <div className="panel px-4 sm:px-5">{upcoming.slice(1).map((r) => <RunRow key={r.id} run={r} />)}</div>
            </section>
          )}

          <section>
            <h2 className="display mb-3 text-[2.2rem]">On the courts</h2>
            <ol className="relative space-y-4 border-l-2 border-paper-line pl-5">
              {state.activity.slice(0, 6).map((a) => (
                <li key={a.id} className="relative">
                  <span className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-paper ${a.kind === "run" ? "bg-ball" : a.kind === "court" ? "bg-emerald" : a.kind === "squad" ? "bg-sky" : a.kind === "achievement" ? "bg-violet" : "bg-sun"}`} />
                  <div className="text-[15px]">{a.text}</div>
                  <div className="text-xs text-ink-3">{ago(a.at)}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-8">
          <section>
            <div className="eyebrow mb-3">Free to play now</div>
            <ul className="space-y-1">
              {avail.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/60">
                  <Avatar config={p.character} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.nickname} <span className="font-normal text-ink-3">· {p.position}</span></div>
                    <div className="truncate text-xs" style={{ color: ARCH[earnedArchetypes(p.dna)[0]].color }}>{archetypeName(p.dna, p.position)}</div>
                  </div>
                  <span className="text-xs text-ink-3">{p.city}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="eyebrow mb-3">Courts near you</div>
            <ul className="space-y-2">
              {courtsNear.map((c) => {
                const active = state.runs.filter((r) => r.courtId === c.id && r.status !== "reviewed").length;
                return (
                  <li key={c.id}>
                    <Link href={`/courts?c=${c.id}`} className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 hover:border-paper-line hover:bg-white/60">
                      <span className={`grid h-10 w-10 place-items-center rounded-lg ${c.indoor ? "bg-sky-soft text-[#1d6f96]" : "bg-sun-soft text-[#8a6413]"}`}><I.Pin width={18} height={18} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{c.name}</span>
                        <span className="block text-xs text-ink-3">{distLabel(c)} · {c.indoor ? "Indoor" : "Outdoor"}{c.lights ? " · Lights" : ""}</span>
                      </span>
                      {active > 0 ? <span className="num rounded-full bg-ball/10 px-2 py-0.5 text-[11px] font-bold text-ball">{active} live</span> : <CourtBadge v={c.verification} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {featured && (
            <Link href={`/opportunities?o=${featured.id}`} className="block overflow-hidden rounded-2xl bg-emerald text-paper">
              <div className="relative p-5">
                <CourtArt className="absolute -right-10 -top-6 h-52 w-auto" stroke="#fff" opacity={0.18} />
                <div className="eyebrow !text-paper/70">Featured · {featured.type}</div>
                <div className="display mt-2 text-[1.9rem]">{featured.title}</div>
                <div className="mt-2 text-sm text-paper/80">{when(featured.date)} · {featured.cost}</div>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">{featured.spots} team spots left <I.Chevron width={16} height={16} /></div>
              </div>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
