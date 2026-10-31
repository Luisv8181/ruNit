"use client";

import { Suspense, useState } from "react";
import { Friends } from "@/components/Friends";
import { headToHead } from "@/lib/friends";
import { useStore } from "@/lib/store";
import type { Archetype, Player } from "@/lib/types";
import { ARCH, ARCH_ORDER, archetypeName, earnedArchetypes } from "@/lib/archetypes";
import { heightLabel, when } from "@/lib/util";
import { Avatar, PlayerFigure } from "@/components/PlayerFigure";
import { CourtArt, DNABars, Empty } from "@/components/ui";
import { I } from "@/components/icons";

const TABS = ["Friends", "Players", "Squads", "Rankings", "Challenges"] as const;
type Tab = (typeof TABS)[number];

export default function Community() {
  const [tab, setTab] = useState<Tab>("Friends");
  return (
    <div>
      <h1 className="display text-[3rem] sm:text-[4rem]">Your people</h1>
      <div className="sticky top-16 z-30 -mx-4 mt-5 bg-paper/90 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${tab === t ? "bg-ink text-paper" : "text-ink-2 hover:bg-ink/5"}`}>{t}</button>)}
        </div>
      </div>
      <div className="mt-6">
        {tab === "Friends" && <Suspense><Friends /></Suspense>}
        {tab === "Players" && <Players />}
        {tab === "Squads" && <Squads />}
        {tab === "Rankings" && <Rankings />}
        {tab === "Challenges" && <Challenges />}
      </div>
    </div>
  );
}

function Players() {
  const { state } = useStore();
  const [city, setCity] = useState<"All" | "Hazleton" | "Scranton">("All");
  const [arch, setArch] = useState<Archetype | null>(null);
  const [now, setNow] = useState(false);
  const [open, setOpen] = useState<Player | null>(null);
  const list = state.players.filter((p) => p.id !== state.meId && !state.blocked.includes(p.id))
    .filter((p) => city === "All" || (city === "Hazleton" ? ["Hazleton", "West Hazleton"] : ["Scranton", "Dunmore"]).includes(p.city))
    .filter((p) => !arch || earnedArchetypes(p.dna).includes(arch))
    .filter((p) => !now || p.availableNow);
  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {(["All", "Hazleton", "Scranton"] as const).map((c) => <button key={c} className={`chip ${city === c ? "chip-on" : ""}`} onClick={() => setCity(c)}>{c}</button>)}
        <span className="mx-1 w-px bg-ink/10" />
        <button className={`chip ${now ? "chip-on" : ""}`} onClick={() => setNow((x) => !x)}>Free now</button>
        {ARCH_ORDER.map((a) => (
          <button key={a} className="chip" aria-pressed={arch === a} onClick={() => setArch(arch === a ? null : a)} style={arch === a ? { background: ARCH[a].color, borderColor: ARCH[a].color, color: "#fff" } : undefined}>{ARCH[a].label}</button>
        ))}
      </div>
      {list.length === 0 ? <Empty title="Nobody matches" body="Loosen a filter." /> : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const a = earnedArchetypes(p.dna);
            return (
              <li key={p.id}>
                <button onClick={() => setOpen(p)} className="group flex w-full items-center gap-3 rounded-xl py-3 pr-2 text-left hover:bg-ink/[.04]">
                  <div className="relative"><Avatar config={p.character} size={52} />{p.availableNow && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-paper bg-emerald" title="Free now" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2"><span className="truncate font-bold">{p.nickname}</span><span className="truncate text-xs text-ink-3">{p.position}, {p.city}</span></div>
                    <div className="mt-0.5 truncate text-sm font-semibold" style={{ color: ARCH[a[0]].color }}>{archetypeName(p.dna, p.position)}</div>
                    <div className="mt-1 flex gap-1">{ARCH_ORDER.map((k) => <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: ARCH[k].color, opacity: 0.15 + (p.dna[k] / 100) * 0.85 }} />)}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && <PlayerSheet p={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function PlayerSheet({ p, onClose }: { p: Player; onClose: () => void }) {
  const { state, dispatch, court } = useStore();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [invited, setInvited] = useState<string | null>(null);
  const myRuns = state.runs.filter((r) => r.hostId === state.meId && ["open", "full", "checkin"].includes(r.status) && !r.participants.includes(p.id) && r.participants.length < r.capacity);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-night/60 sm:place-items-center sm:p-6" onClick={onClose}>
      <div className="rise max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-[28px] bg-paper sm:rounded-[28px]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${p.nickname} profile`}>
        <div className="scope-night relative overflow-hidden bg-ink p-6 text-paper">
          <CourtArt className="absolute -right-10 -top-10 h-72" stroke="#fff" opacity={0.08} />
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10"><I.X width={16} height={16} /></button>
          <div className="relative flex items-end gap-4">
            <PlayerFigure config={p.character} size={120} idSuffix={`sheet-${p.id}`} />
            <div className="pb-6">
              <div className="display text-[2.8rem]">{p.nickname}</div>
              <div className="text-sm text-paper/70">{p.position}, {heightLabel(p.heightIn)}, {p.city}</div>
              <div className="mt-1 text-sm font-bold" style={{ color: ARCH[earnedArchetypes(p.dna)[0]].color }}>{archetypeName(p.dna, p.position)}</div>
            </div>
          </div>
        </div>
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-ink/[.04] py-3"><div className="num text-xl font-bold">{p.mmr}</div><div className="text-[10px] text-ink-3">MMR</div></div>
            <div className="rounded-xl bg-ink/[.04] py-3"><div className="num text-xl font-bold">{p.trust.attendance}%</div><div className="text-[10px] text-ink-3">Shows up</div></div>
            <div className="rounded-xl bg-ink/[.04] py-3"><div className="num text-xl font-bold">{p.trust.sportsmanship.toFixed(1)}</div><div className="text-[10px] text-ink-3">Sportsmanship</div></div>
          </div>
          <DNABars dna={p.dna} compact />
          {myRuns.length > 0 && (
            <div>
              <div className="eyebrow mb-2">Invite to your run</div>
              {myRuns.map((r) => (
                <button key={r.id} disabled={invited === r.id} onClick={() => { dispatch({ type: "simJoin", runId: r.id, playerId: p.id }); setInvited(r.id); }} className="flex w-full items-center justify-between rounded-xl border border-paper-line px-3 py-2.5 text-left text-sm hover:bg-surface">
                  <span><b>{r.title}</b>, {court(r.courtId)?.name}, {when(r.startsAt)}</span>
                  <span className="font-bold text-ball-ink">{invited === r.id ? "Accepted (demo)" : "Invite"}</span>
                </button>
              ))}
            </div>
          )}
          {(() => {
            const h = headToHead(state.meId, p.id, state.courtGames);
            const isFriend = state.friends.includes(p.id);
            return (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-3">
                <div>
                  <div className="text-sm text-ink-2">You vs {p.nickname}</div>
                  <div className="num text-[34px] leading-none">{h.vsW}–{h.vsL}</div>
                  {h.withW + h.withL > 0 && <div className="text-sm text-ink-2">Together {h.withW}–{h.withL}</div>}
                </div>
                {isFriend ? <span className="text-sm font-bold text-emerald">✓ Friends</span> : <button className="btn-ball py-2" onClick={() => dispatch({ type: "addFriend", playerId: p.id })}>Add friend</button>}
              </div>
            );
          })()}
          <p className="rounded-xl bg-sky-soft/60 p-3 text-xs text-ink-2">Direct messages aren&apos;t in this build. When they arrive they&apos;re adults-only, opt-in, and can be turned off; organizers contact players through runs and events.</p>
          {reporting ? (
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (!reason) return; dispatch({ type: "report", playerId: p.id, reason }); setReporting(false); onClose(); }}>
              <div className="eyebrow">Report {p.nickname}</div>
              <div className="flex flex-wrap gap-2">{["No-show pattern", "Unsportsmanlike", "Harassment", "Fake stats", "Other"].map((r) => <button type="button" key={r} className={`chip ${reason === r ? "chip-on" : ""}`} onClick={() => setReason(r)}>{r}</button>)}</div>
              <div className="flex gap-2"><button type="button" className="btn-line flex-1" onClick={() => setReporting(false)}>Cancel</button><button className="btn-ink flex-1" disabled={!reason}>Send report</button></div>
              <p className="text-[11px] text-ink-3">Reports go to ruNit moderators, not to the player.</p>
            </form>
          ) : (
            <div className="flex gap-2 border-t border-paper-line pt-4">
              <button className="btn-ghost text-ink-2" onClick={() => setReporting(true)}><I.Flag width={15} height={15} />Report</button>
              <button className="btn-ghost text-warn" onClick={() => { dispatch({ type: "block", playerId: p.id }); onClose(); }}>Block</button>
              {state.reports.some((r) => r.playerId === p.id) && <span className="ml-auto self-center text-xs text-ink-3">Report sent</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Squads() {
  const { state, dispatch, player, court } = useStore();
  return (
    <div className="space-y-8">
      <ul className="grid gap-4 md:grid-cols-2">
        {state.squads.map((s) => {
          const mine = s.members.includes(state.meId);
          return (
            <li key={s.id} className="relative overflow-hidden rounded-[22px] border border-paper-line bg-surface/70">
              <div className="h-2" style={{ background: s.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="display text-[2rem]">{s.name}</div>
                    <div className="text-sm text-ink-2">{s.tagline}</div>
                  </div>
                  <div className="text-right"><div className="num text-2xl font-bold">{s.record.w}–{s.record.l}</div><div className="text-[10px] text-ink-3">record</div></div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center">
                    <div className="flex -space-x-2">{s.members.map((m) => { const p = player(m); return p ? <span key={m} className="rounded-full ring-2 ring-paper"><Avatar config={p.character} size={32} ring={false} /></span> : null; })}</div>
                    <span className="ml-3 text-xs text-ink-3">Home: {court(s.homeCourtId)?.name}</span>
                  </div>
                  {mine ? (
                    <button className="btn-line py-2" onClick={() => dispatch({ type: "leaveSquad", squadId: s.id })}>Leave</button>
                  ) : s.open ? (
                    <button className="btn-ball py-2" onClick={() => dispatch({ type: "joinSquad", squadId: s.id })}>Join squad</button>
                  ) : (
                    <span className="text-xs font-semibold text-ink-3">Invite only</span>
                  )}
                </div>
                {mine && <div className="rise mt-3 flex items-center gap-2 rounded-xl bg-emerald-soft px-3 py-2 text-sm text-emerald"><I.Check width={16} height={16} />You&apos;re on {s.name}. Squad runs will show on Home.</div>}
              </div>
            </li>
          );
        })}
      </ul>
      <section>
        <div className="eyebrow mb-2">Court photos</div>
        <div className="rounded-2xl border border-dashed border-ink/20 p-5 text-sm text-ink-2">Players and local photographers can post court and game photos with credit. Uploads aren&apos;t part of this demo build, so there are no photos here yet — we won&apos;t fill this with stock images.</div>
      </section>
    </div>
  );
}

function Rankings() {
  const { state } = useStore();
  const [region, setRegion] = useState<"Hazleton" | "Scranton">("Hazleton");
  const list = state.players.filter((p) => (region === "Hazleton" ? ["Hazleton", "West Hazleton"] : ["Scranton", "Dunmore"]).includes(p.city)).sort((a, b) => b.mmr - a.mmr);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-ink/15 bg-surface/60 p-1">{(["Hazleton", "Scranton"] as const).map((r) => <button key={r} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${region === r ? "bg-ink text-paper" : "text-ink-2"}`} onClick={() => setRegion(r)}>{r}</button>)}</div>
        <span className="text-xs text-ink-3">Ranked games only, last 90 days, demo season</span>
      </div>
      <ol className="overflow-hidden rounded-2xl border border-paper-line bg-surface/60">
        {list.map((p, i) => (
          <li key={p.id} className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-paper-line px-4 py-3 last:border-0 ${p.id === state.meId ? "bg-ball/[.08]" : ""}`}>
            <span className={`display text-center text-[2rem] ${i < 3 ? "text-ball-ink" : "text-ink-3"}`}>{i + 1}</span>
            <div className="flex min-w-0 items-center gap-3">
              <Avatar config={p.character} size={36} />
              <div className="min-w-0"><div className="truncate font-bold">{p.nickname}{p.id === state.meId && " (you)"}</div><div className="truncate text-xs text-ink-3">{archetypeName(p.dna, p.position)}, {p.trust.confirmedGames} confirmed games</div></div>
            </div>
            <span className="num text-lg font-bold">{p.mmr}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-ink-3">Rankings use MMR only. Player DNA and Trust don&apos;t affect rank, and rank never decides anyone&apos;s eligibility for an opportunity.</p>
    </div>
  );
}

function Challenges() {
  const { state, dispatch, court, player } = useStore();
  const name = (id: string) => state.squads.find((s) => s.id === id)?.name ?? player(id)?.nickname ?? "?";
  return (
    <ul className="space-y-3">
      {state.challenges.map((c) => {
        const forMe = c.to === state.meId || state.squads.find((s) => s.id === c.to)?.members.includes(state.meId);
        return (
          <li key={c.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-paper-line bg-surface/60 p-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-sun"><I.Bolt /></span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{name(c.from)} → {name(c.to)}</div>
              <div className="text-sm text-ink-2">{c.format} at {court(c.courtId)?.name}, {when(c.when)}</div>
            </div>
            {c.status === "accepted" ? <span className="flex items-center gap-1 text-sm font-bold text-emerald"><I.Check width={16} height={16} />Accepted</span>
              : forMe ? <button className="btn-ball py-2" onClick={() => dispatch({ type: "acceptChallenge", id: c.id })}>Accept</button>
              : <span className="text-xs text-ink-3">Join {name(c.to)} to respond</span>}
          </li>
        );
      })}
    </ul>
  );
}
