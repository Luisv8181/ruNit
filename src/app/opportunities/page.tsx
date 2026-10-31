"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Opportunity, OpportunityType } from "@/lib/types";
import { CourtArt, Empty } from "@/components/ui";
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
      <section className="mb-8">
        <CourtArt className="absolute -right-20 -top-16 h-[440px] rotate-[-6deg]" stroke="#fff" opacity={0.14} />
        <div className="relative max-w-xl">
                    <h1 className="display text-[3.2rem] sm:text-[4.6rem]">Open the next door</h1>
          <p className="mt-3 text-lg text-ink-2">Tournaments, coaching, reffing, jobs and programs near you. Every listing shows who posted it and whether they&apos;re verified. ruNit never promises recruitment or scholarships, and ratings never decide who gets picked.</p>
        </div>
      </section>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button className={`chip ${type === "All" ? "chip-on" : ""}`} onClick={() => setType("All")}>All types</button>
          {usedTypes.map((t) => <button key={t} className={`chip ${type === t ? "chip-on" : ""}`} onClick={() => setType(t)}>{t}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["All", "Hazleton", "Scranton"] as const).map((c) => <button key={c} className={`chip ${city === c ? "chip-on" : ""}`} onClick={() => setCity(c)}>{c === "All" ? "Anywhere in NEPA" : c}</button>)}
          <span className="mx-1 h-5 w-px bg-ink/10" />
          {([14, 30, 90] as const).map((d) => <button key={d} className={`chip ${window === d ? "chip-on" : ""}`} onClick={() => setWindow(d)}>Next {d} days</button>)}
          <button className={`chip ${adultsOnly ? "chip-on" : ""}`} onClick={() => setAdultsOnly((x) => !x)}>18+ only</button>
        </div>
      </div>

      {list.length === 0 ? <Empty title="Nothing in that window" body="Widen the date range or clear a filter." /> : (
        <ul className="divide-y divide-paper-line overflow-hidden rounded-[22px] border border-paper-line bg-surface/60">
          {list.map((o) => {
            const d = new Date(o.date);
            const interested = !!state.interests[o.id];
            return (
              <li key={o.id}>
                <button className="grid w-full grid-cols-[64px_1fr] items-center gap-4 px-4 py-4 text-left hover:bg-surface sm:grid-cols-[72px_1fr_auto] sm:px-6" onClick={() => setOpen(o.id)}>
                  <div className="text-center">
                    <div className="eyebrow ">{d.toLocaleDateString([], { month: "short" })}</div>
                    <div className="display text-[2.4rem] leading-none">{d.getDate()}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded px-1.5 py-px text-[10px] font-bold text-white" style={{ background: TYPE_COLOR[o.type] }}>{o.type}</span>
                      {o.organizerVerified ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald"><I.Shield width={13} height={13} />Verified organizer</span> : <span className="text-[11px] font-semibold text-warn">Unverified organizer</span>}
                    </div>
                    <div className="mt-1 truncate text-[17px] font-bold">{o.title}</div>
                    <div className="truncate text-sm text-ink-2">{o.org}, {o.city}, {o.eligibility}</div>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
                    <span className="text-sm font-semibold">{o.cost}</span>
                    {interested ? <span className="flex items-center gap-1 text-xs font-bold text-emerald"><I.Check width={14} height={14} />Interested</span> : <span className="text-xs font-semibold text-ball-ink">Details</span>}
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
            <div>{o.organizerVerified ? <><b>Verified organizer.</b> Identity and organization confirmed by ruNit staff.</> : <><b>Not verified yet.</b> Confirm details directly before paying anything.</>}</div>
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
              <p className="mt-1 text-sm text-ink-2">{interest.shareCard ? "The organizer can see your public ruNit card." : "The organizer sees only your nickname. Your card stays private."} In the live app they reply through ruNit.</p>
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
