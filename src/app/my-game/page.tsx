"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { ARCH, archetypeName, earnedArchetypes } from "@/lib/archetypes";
import { ruleBasedProvider } from "@/lib/insights";
import { badges as badgesFor, passport } from "@/lib/records";
import { dateShort, heightLabel } from "@/lib/util";
import { PlayerFigure } from "@/components/PlayerFigure";
import { CourtArt, DNABars, Empty, StatBadge } from "@/components/ui";
import { I } from "@/components/icons";

export default function MyGame() {
  const { state, me, court } = useStore();
  const [sharing, setSharing] = useState(false);
  const games = [...state.history].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const insights = useMemo(() => ruleBasedProvider.generate({ history: state.history, reflections: state.reflections }), [state.history, state.reflections]);
  const avg = (k: "pts" | "ast" | "reb" | "stl" | "blk" | "tov") => (games.length ? games.reduce((t, g) => t + g.line[k], 0) / games.length : 0);
  const confirmed = games.filter((g) => g.verification !== "self").length;
  const ranked = games.filter((g) => g.mode === "ranked");
  const wins = games.filter((g) => g.result === "W").length;
  const localRank = [...state.players].filter((p) => ["Hazleton", "West Hazleton"].includes(p.city)).sort((a, b) => b.mmr - a.mmr).findIndex((p) => p.id === me.id) + 1;
  const arch = earnedArchetypes(me.dna);
  const name = archetypeName(me.dna, me.position);

  const stamps = useMemo(() => passport(state.meId, state.courts, state.courtGames), [state]);
  const badgeList = useMemo(() => badgesFor(state.meId, state.courts, state.courtGames), [state]);
  const achievements = [
    { t: "Shows up", d: `${me.trust.attendance}% attendance`, on: me.trust.attendance >= 90 },
    { t: "On the record", d: "First opponent-confirmed line", on: games.some((g) => g.verification === "opponent") },
    { t: "Ladder climber", d: "3 ranked wins", on: ranked.filter((g) => g.result === "W").length >= 3 },
    { t: "Self-scout", d: "5 reflections", on: state.reflections.length >= 5, progress: `${Math.min(5, state.reflections.length)}/5` },
  ];

  return (
    <div className="space-y-10">
      {/* PLAYER CARD */}
      <section className="relative overflow-hidden rounded-[30px] bg-ink text-paper">
        <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_75%_30%,rgba(244,123,53,.35),transparent_60%),radial-gradient(50%_60%_at_10%_100%,rgba(244,198,94,.18),transparent_60%)]" />
        <CourtArt className="absolute -bottom-40 right-0 h-[560px]" stroke="#FFF9F0" opacity={0.07} />
        <div className="relative grid gap-6 p-6 sm:p-10 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col">
            <div className="text-[15px] font-semibold text-sun">{me.city}</div>
            <h1 className="display mt-3 text-[clamp(4rem,12vw,7.5rem)]">{me.nickname}</h1>
            <div className="mt-1 text-paper/70">{me.name}, {me.position}, {heightLabel(me.heightIn)}, #{me.character.jersey.number}</div>
            <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-paper/15 bg-white/5 py-1.5 pl-1.5 pr-4">
              <span className="flex -space-x-1">{arch.map((a) => <span key={a} className="h-6 w-6 rounded-full ring-2 ring-ink" style={{ background: ARCH[a].color }} />)}</span>
              <span className="font-bold">{name}</span>
            </div>
            <p className="mt-3 max-w-md text-sm text-paper/60">{arch.map((a) => ARCH[a].read).join(" ")} Archetype comes from how you&apos;ve actually played and what you&apos;ve told us — not a label we picked.</p>

            {/* Three separate systems */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/[.06] p-4">
                <div className="eyebrow !text-paper/50">Competitive, MMR</div>
                <div className="num mt-1 text-4xl font-bold">{me.mmr}</div>
                <div className="text-xs text-paper/60">#{localRank} in Hazleton, {ranked.length} ranked games</div>
              </div>
              <div className="rounded-2xl bg-white/[.06] p-4">
                <div className="eyebrow !text-paper/50">Trust</div>
                <div className="num mt-1 text-4xl font-bold">{me.trust.attendance}<span className="text-xl text-paper/50">%</span></div>
                <div className="text-xs text-paper/60">shows up, {me.trust.sportsmanship.toFixed(1)} sportsmanship, {me.trust.confirmedGames} confirmed</div>
              </div>
              <div className="rounded-2xl bg-white/[.06] p-4">
                <div className="eyebrow !text-paper/50">Record</div>
                <div className="num mt-1 text-4xl font-bold">{wins}–{games.length - wins}</div>
                <div className="text-xs text-paper/60">{confirmed}/{games.length} games confirmed by others</div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/my-game/customize" className="btn-ball"><I.Spark width={16} height={16} />Customize player</Link>
              <button className="btn border border-paper/20 text-paper hover:bg-white/10" onClick={() => setSharing(true)}>Share card</button>
            </div>
          </div>
          <div className="relative mx-auto self-end">
            <PlayerFigure config={me.character} size={260} idSuffix="card" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold tracking-[.2em] text-paper/40">{me.character.effects.map((e) => ARCH[e].effect).join(" + ") || "No skill effect equipped"}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <section>
            <h2 className="display mb-4 text-[2.4rem]">What your games say</h2>
            <div className="space-y-3">
              {insights.map((x) => (
                <article key={x.id} className="panel pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${x.confidence === "Consistent pattern" ? "bg-emerald-soft text-emerald" : x.confidence === "Emerging pattern" ? "bg-sun-soft text-[#8a6413]" : "bg-ink/5 text-ink-2"}`}>{x.confidence}</span>
                    <span className="text-[11px] text-ink-3">{x.evidence}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold">{x.headline}</h3>
                  <p className="mt-1 text-ink-2">{x.body}</p>
                  {x.suggestion && <p className="mt-3 rounded-xl bg-ball/[.07] p-3 text-sm font-medium">{x.suggestion}</p>}
                </article>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-3">Insights are generated by a transparent rules engine ({ruleBasedProvider.name}) from your stats and reflections. They show what they&apos;re based on and how sure they are.</p>
          </section>

          <section>
            <h2 className="display mb-3 text-[2.4rem]">Game log</h2>
            <div className="mb-4 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-paper-line bg-paper-line sm:grid-cols-6">
              {(["pts", "ast", "reb", "stl", "blk", "tov"] as const).map((k) => (
                <div key={k} className="bg-paper px-3 py-3 text-center">
                  <div className="num text-2xl font-bold">{avg(k).toFixed(1)}</div>
                  <div className="text-[11px] text-ink-3">{k === "tov" ? "TO" : k.toUpperCase()}/g</div>
                </div>
              ))}
            </div>
            {games.length === 0 ? <Empty title="No games yet" body="Your first saved game will show here." /> : (
              <ul className="divide-y divide-paper-line rounded-2xl border border-paper-line bg-white/60">
                {games.map((g) => (
                  <li key={g.runId} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-3">
                    <span className={`display grid h-11 w-11 place-items-center rounded-xl text-xl ${g.result === "W" ? "bg-emerald text-paper" : "bg-ink/[.06] text-ink-2"}`}>{g.result}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{court(g.courtId)?.name}, <span className="num">{g.score}</span></div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                        <span>{dateShort(g.date)}, {g.format}, {g.mode}</span>
                        <StatBadge v={g.verification} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="num text-sm"><b>{g.line.pts}</b> pts, {g.line.reb} reb, {g.line.ast} ast</div>
                      {g.mmrDelta !== undefined && <div className={`num text-xs font-bold ${g.mmrDelta >= 0 ? "text-emerald" : "text-[#b4441a]"}`}>{g.mmrDelta >= 0 ? "+" : ""}{g.mmrDelta}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="display mb-3 text-[2.4rem]">Reflections</h2>
            <ul className="space-y-3">
              {[...state.reflections].sort((a, b) => +new Date(b.date) - +new Date(a.date)).map((r) => (
                <li key={r.runId} className="rounded-2xl border border-paper-line bg-white/60 p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs text-ink-3">{dateShort(r.date)}</span>
                    {r.scoring.map((t) => <span key={t} className="rounded-full bg-ink/[.05] px-2 py-0.5 text-xs font-semibold">{t}</span>)}
                  </div>
                  {(r.strongest || r.difficult || r.learned || r.improve) && (
                    <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      {r.strongest && <div><dt className="inline text-ink-3">Strongest: </dt><dd className="inline">{r.strongest}</dd></div>}
                      {r.difficult && <div><dt className="inline text-ink-3">Hard: </dt><dd className="inline">{r.difficult}</dd></div>}
                      {r.learned && <div><dt className="inline text-ink-3">Learned: </dt><dd className="inline">{r.learned}</dd></div>}
                      {r.improve && <div><dt className="inline text-ink-3">Working on: </dt><dd className="inline">{r.improve}</dd></div>}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-8">
          <section className="panel pt-5">
            <div className="eyebrow mb-3">Player DNA</div>
            <DNABars dna={me.dna} />
            {state.dnaLog[0] && <p className="mt-4 border-t border-paper-line pt-3 text-xs text-ink-2"><b>Last change:</b> {state.dnaLog[0].reasons.join(", ")}</p>}
            <p className="mt-3 text-[11px] text-ink-3">How you play. Separate from MMR (how you compete) and Trust (how you show up).</p>
          </section>
          <section className="border-t-2 border-ink pt-4">
            <h2 className="display text-[1.8rem]">Court passport</h2>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="num text-[52px] leading-none">{stamps.filter((x) => x.status === "won").length}<span className="text-ink-3">/{state.courts.length}</span></span>
              <span className="text-[15px] text-ink-2">courts won</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-[15px]">
              {badgeList.filter((b) => b.earned).map((b) => <li key={b.id} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-ball" />{b.name}</li>)}
              {badgeList.filter((b) => !b.earned && b.progress).slice(0, 2).map((b) => <li key={b.id} className="flex items-center gap-2 text-ink-2"><span className="h-2.5 w-2.5 rounded-full border-2 border-ink/25" />{b.name}, {b.progress![0]} of {b.progress![1]}</li>)}
            </ul>
            <Link href="/my-game/passport" className="btn-line mt-4">Open passport</Link>
          </section>
          <section>
            <div className="eyebrow mb-3">Media</div>
            <div className="rounded-2xl border border-dashed border-ink/20 p-5 text-sm text-ink-2">
              Clips and photos attach to games and can support a stat line (the “video-supported” step). <b className="text-ink">Upload isn&apos;t in this demo build.</b>
            </div>
          </section>
        </aside>
      </div>

      {sharing && <ShareCard onClose={() => setSharing(false)} />}
    </div>
  );
}

function ShareCard({ onClose }: { onClose: () => void }) {
  const { me, state } = useStore();
  const [copied, setCopied] = useState(false);
  const games = state.history;
  const ppg = games.length ? games.reduce((t, g) => t + g.line.pts, 0) / games.length : 0;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" onClick={onClose}>
      <div className="rise w-full max-w-[340px]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Share player card">
        <div className="relative aspect-[9/14] overflow-hidden rounded-[26px] bg-gradient-to-b from-[#F9A866] via-[#F47B35] to-[#202B30] p-5 text-paper">
          <CourtArt className="absolute -right-10 top-10 h-[360px]" stroke="#fff" opacity={0.12} />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between"><span className="display text-xl ">ru<span className="text-ink">N</span>it</span><span className="num text-xs">#{me.character.jersey.number}</span></div>
            <div className="mx-auto -mb-10 mt-2"><PlayerFigure config={me.character} size={170} idSuffix="share" /></div>
            <div className="mt-auto">
              <div className="display text-[3rem]">{me.nickname}</div>
              <div className="text-sm font-semibold text-sun">{archetypeName(me.dna, me.position)}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[["MMR", me.mmr], ["PPG", ppg.toFixed(1)], ["Trust", `${me.trust.attendance}%`]].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/10 py-2"><div className="num text-lg font-bold">{v}</div><div className="text-[10px] text-paper/60">{k}</div></div>
                ))}
              </div>
              <div className="mt-3 text-center text-[10px] tracking-[.2em] text-paper/50">{me.city}, Demo card</div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn-ball flex-1" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/my-game`).catch(() => {}); setCopied(true); }}>{copied ? "Link copied" : "Copy link"}</button>
          <button className="btn bg-paper text-ink" onClick={onClose}>Close</button>
        </div>
        <p className="mt-2 text-center text-[11px] text-paper/70">Only what you choose is public. Your real name and city stay private by default.</p>
      </div>
    </div>
  );
}
