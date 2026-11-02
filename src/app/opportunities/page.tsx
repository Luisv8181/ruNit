"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Opportunity, OpportunityType } from "@/lib/types";
import { Empty } from "@/components/ui";
import { I } from "@/components/icons";

const TYPES: OpportunityType[] = ["Tournament", "Camp", "Showcase", "Coaching", "Refereeing", "Training", "Employment", "Sponsorship", "Community"];
const TYPE_COLOR: Record<OpportunityType, string> = {
  Tournament: "#F47B35", Camp: "#F4C65E", Showcase: "#56B8E8", Coaching: "#239B72", Refereeing: "#202B30",
  Training: "#8A6BE0", Employment: "#239B72", Sponsorship: "#F4C65E", Community: "#56B8E8",
};

export default function OppsPage() {
  return <Suspense><Opps /></Suspense>;
}

function Opps() {
  const { state } = useStore();
  const params = useSearchParams();
  const [type, setType] = useState<OpportunityType | "All">("All");
  const [city, setCity] = useState<"All" | "Hazleton" | "Scranton">("All");
  const [window, setWindow] = useState<14 | 30 | 90>(90);
  const [adultsOnly, setAdultsOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(params.get("o"));
  const list = state.opportunities
    .filter((o) => type === "All" || o.type === type)
    .filter((o) => city === "All" || (city === "Hazleton" ? ["Hazleton", "West Hazleton"] : ["Scranton", "Dunmore"]).includes(o.city))
    .filter((o) => +new Date(o.date) - Date.now() <= window * 86400e3)
    .filter((o) => !adultsOnly || o.eligibility !== "All ages")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const sel = state.opportunities.find((o) => o.id === open);
  const usedTypes = TYPES.filter((t) => state.opportunities.some((o) => o.type === t));

  return (
    <div>
      <section className="mb-6 max-w-2xl">
        <p className="eyebrow mb-2">Beyond the pickup game</p>
        <h1 className="display text-[3.2rem] sm:text-[4.4rem]">Open the next door</h1>
        <p className="mt-3 text-base text-ink-2 sm:text-lg">Tournaments, training, coaching, work, and community events near you.</p>
      </section>

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-paper-line bg-surface/60 p-4">
        <label className="min-w-[180px] flex-1 text-xs font-bold text-ink-2">Type
          <select className="field mt-1 text-sm" value={type} onChange={(e) => setType(e.target.value as OpportunityType | "All")}>
            <option value="All">All opportunities</option>
            {usedTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="min-w-[180px] flex-1 text-xs font-bold text-ink-2">Area
          <select className="field mt-1 text-sm" value={city} onChange={(e) => setCity(e.target.value as "All" | "Hazleton" | "Scranton")}>
            <option value="All">Anywhere in NEPA</option><option value="Hazleton">Hazleton</option><option value="Scranton">Scranton</option>
          </select>
        </label>
        <label className="min-w-[180px] flex-1 text-xs font-bold text-ink-2">When
          <select className="field mt-1 text-sm" value={window} onChange={(e) => setWindow(Number(e.target.value) as 14 | 30 | 90)}>
            <option value={14}>Next 14 days</option><option value={30}>Next 30 days</option><option value={90}>Next 90 days</option>
          </select>
        </label>
        <label className="flex min-h-[46px] items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" className="h-4 w-4 accent-ball" checked={adultsOnly} onChange={(e) => setAdultsOnly(e.target.checked)} />18+ only</label>
      </div>
      <details className="mb-6 text-xs text-ink-3"><summary className="cursor-pointer font-semibold underline underline-offset-4">How listings are checked</summary><p className="mt-2 max-w-2xl">Every listing shows who posted it and whether they&apos;re verified. RUN IT never promises recruitment or scholarships, and ratings never decide who gets picked.</p></details>

      {list.length === 0 ? <Empty title="Nothing in that window" body="Widen the date range or clear a filter." /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((o) => {
            const d = new Date(o.date);
            const interested = !!state.interests[o.id];
            return (
              <li key={o.id}>
                <button className="flex h-full w-full flex-col rounded-[22px] border border-l-4 border-paper-line bg-surface/70 p-5 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink" style={{ borderLeftColor: TYPE_COLOR[o.type] }} onClick={() => setOpen(o.id)}>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-2">
                    <span className="rounded-full bg-ink/5 px-2.5 py-1 text-ink">{o.type}</span>
                    <span>{d.toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                    {o.organizerVerified ? <span className="inline-flex items-center gap-1 text-emerald"><I.Shield width={13} height={13} />Verified organizer</span> : <span className="text-warn">Unverified organizer</span>}
                  </div>
                  <h2 className="mt-4 text-xl font-bold leading-tight">{o.title}</h2>
                  <p className="mt-2 text-sm text-ink-2">{o.org} · {o.city} · {o.eligibility}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink/10 pt-4 text-sm">
                    <span className="font-semibold">{o.cost}</span>
                    {interested ? <span className="flex items-center gap-1 font-bold text-emerald"><I.Check width={14} height={14} />Interested</span> : <span className="font-bold text-ball-ink">View details →</span>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {sel && <OppSheet o={sel} onClose={() => setOpen(null)} />}
    </div>
  );
}

function OppSheet({ o, onClose }: { o: Opportunity; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const interest = state.interests[o.id];
  const [share, setShare] = useState(false);
  const [sending, setSending] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-night/60 sm:place-items-center sm:p-6" onClick={onClose}>
      <div className="rise max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-[28px] bg-paper sm:rounded-[28px]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={o.title}>
        <div className="relative p-6" style={{ background: `${TYPE_COLOR[o.type]}22` }}>
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-paper"><I.X width={16} height={16} /></button>
          <div className="eyebrow">{o.type}, {new Date(o.date).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div>
          <h2 className="display mt-2 pr-10 text-[2.4rem]">{o.title}</h2>
          <div className="mt-1 text-sm text-ink-2">{o.org}</div>
        </div>
        <div className="space-y-5 p-6">
          <div className={`flex items-start gap-3 rounded-xl p-3 text-sm ${o.organizerVerified ? "bg-emerald-soft/70" : "bg-warn/15"}`}>
            <I.Shield className={o.organizerVerified ? "text-emerald" : "text-warn"} />
            <div>{o.organizerVerified ? <><b>Verified organizer.</b> Identity and organization confirmed by RUN IT staff.</> : <><b>Not verified yet.</b> Confirm details directly before paying anything.</>}</div>
          </div>
          <p>{o.summary}</p>
          <ul className="space-y-1.5 text-sm">{o.details.map((d) => <li key={d} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ball" />{d}</li>)}</ul>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-ink/[.04] p-3"><dt className="text-[11px] text-ink-3">Where</dt><dd className="font-semibold">{o.city}</dd></div>
            <div className="rounded-xl bg-ink/[.04] p-3"><dt className="text-[11px] text-ink-3">Cost</dt><dd className="font-semibold">{o.cost}</dd></div>
            <div className="rounded-xl bg-ink/[.04] p-3"><dt className="text-[11px] text-ink-3">Who</dt><dd className="font-semibold">{o.eligibility}</dd></div>
          </dl>
          {interest ? (
            <div className="rounded-2xl border border-emerald/30 bg-emerald-soft/50 p-4">
              <div className="flex items-center gap-2 font-bold text-emerald"><I.Check />You&apos;re on the interest list</div>
              <p className="mt-1 text-sm text-ink-2">{interest.shareCard ? "The organizer can see your public RUN IT card." : "The organizer sees only your nickname. Your card stays private."} In the live app they reply through RUN IT.</p>
              <button className="btn-ghost mt-2 px-0 text-sm" onClick={() => dispatch({ type: "withdrawInterest", oppId: o.id })}>Withdraw interest</button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-paper-line p-3">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-ball" checked={share} onChange={(e) => setShare(e.target.checked)} />
                <span className="text-sm"><b>Share my player card with this organizer</b><span className="block text-ink-3">Off by default. Includes verified games, DNA and achievements — never your contact info.</span></span>
              </label>
              <button className="btn-ball w-full py-3" disabled={sending} onClick={() => { setSending(true); setTimeout(() => { dispatch({ type: "interest", oppId: o.id, shareCard: share }); setSending(false); }, 500); }}>{sending ? "Sending…" : "I'm interested"}</button>
              <p className="text-center text-[11px] text-ink-3">Demo: no real organizer receives this.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
