"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { CourtMap, type Region } from "@/components/CourtMap";
import { CourtBadge, courtVerificationTip, DemoTag } from "@/components/ui";
import { I } from "@/components/icons";
import { CourtRecords } from "@/components/CourtRecords";
import { GotNext } from "@/components/GotNext";
import { kingsByCourt } from "@/lib/records";
import { distLabel, when } from "@/lib/util";
import type { Court } from "@/lib/types";

type Filter = "indoor" | "outdoor" | "lights" | "active" | "accessible" | "verified";
const FILTERS: { k: Filter; label: string }[] = [
  { k: "active", label: "Runs now" },
  { k: "outdoor", label: "Outdoor" },
  { k: "indoor", label: "Indoor" },
  { k: "lights", label: "Lights" },
  { k: "accessible", label: "Accessible" },
  { k: "verified", label: "Verified only" },
];

export default function CourtsPage() {
  return <Suspense><Courts /></Suspense>;
}

function Courts() {
  const params = useSearchParams();
  const { state } = useStore();
  const initial = params.get("c") ?? undefined;
  const initialCourt = state.courts.find((c) => c.id === initial);
  const [region, setRegion] = useState<Region>(initialCourt && ["Scranton", "Dunmore"].includes(initialCourt.city) ? "Scranton" : "Hazleton");
  const [selected, setSelected] = useState<string | undefined>(initial);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [adding, setAdding] = useState(false);

  const activeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    state.runs.filter((r) => !["final", "reviewed"].includes(r.status)).forEach((r) => (m[r.courtId] = (m[r.courtId] ?? 0) + 1));
    return m;
  }, [state.runs]);

  const kings = useMemo(() => kingsByCourt(state.courts, state.courtGames), [state.courts, state.courtGames]);
  const nick = (id?: string) => (id === state.meId ? "you" : state.players.find((p) => p.id === id)?.nickname);
  const inRegion = (c: Court) => (region === "Hazleton" ? ["Hazleton", "West Hazleton"] : ["Scranton", "Dunmore"]).includes(c.city);
  const regionCourts = state.courts.filter(inRegion);
  const regionCourtIds = new Set(regionCourts.map((c) => c.id));
  const regionActiveRuns = state.runs.filter((r) => regionCourtIds.has(r.courtId) && !["final", "reviewed"].includes(r.status) && (r.visibility === "public" || r.participants.includes(state.meId)));
  const regionVerifiedCourts = regionCourts.filter((c) => ["community_verified", "officially_verified"].includes(c.verification));
  const regionAvailablePlayers = state.players.filter((p) => (region === "Hazleton" ? ["Hazleton", "West Hazleton"] : ["Scranton", "Dunmore"]).includes(p.city) && p.availableNow && !state.blocked.includes(p.id));
  const visible = regionCourts.filter((c) =>
    filters.every((f) =>
      f === "indoor" ? c.indoor : f === "outdoor" ? !c.indoor : f === "lights" ? c.lights : f === "active" ? (activeCounts[c.id] ?? 0) > 0 : f === "accessible" ? c.accessible : ["community_verified", "officially_verified"].includes(c.verification)
    )
  );
  const sel = state.courts.find((c) => c.id === selected);
  const toggle = (f: Filter) => setFilters((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x.filter((y) => !(f === "indoor" && y === "outdoor") && !(f === "outdoor" && y === "indoor")), f]));
  const onSelect = useCallback((id: string) => setSelected(id), []);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[3rem] sm:text-[4rem]">Find your court</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-ink/15 bg-surface/60 p-1" role="tablist">
            {(["Hazleton", "Scranton"] as Region[]).map((r) => (
              <button key={r} role="tab" aria-selected={region === r} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${region === r ? "bg-ink text-paper" : "text-ink-2"}`} onClick={() => { setRegion(r); setSelected(undefined); }}>{r}</button>
            ))}
          </div>
          <Link href="/courts/globe" className="btn-line">Globe</Link>
          <button className="btn-line whitespace-nowrap" onClick={() => setAdding(true)}><I.Plus width={16} height={16} /> Add a court</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.k} className={`chip ${filters.includes(f.k) ? "chip-on" : ""}`} aria-pressed={filters.includes(f.k)} onClick={() => toggle(f.k)}>{f.label}</button>
        ))}
        {filters.length > 0 && <button className="chip !border-transparent !bg-transparent underline" onClick={() => setFilters([])}>Clear</button>}
      </div>

      <section className="mb-5 rounded-2xl border border-paper-line bg-surface/60 p-4" aria-label={`${region} court network pulse`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Local court pulse</div>
            <p className="mt-1 text-sm text-ink-2">A snapshot of the {region} network in this build.</p>
          </div>
          <DemoTag />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Mapped courts", regionCourts.length],
            ["Verified venues", regionVerifiedCourts.length],
            ["Active runs", regionActiveRuns.length],
            ["Players free now", regionAvailablePlayers.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-paper p-3">
              <div className="num text-2xl font-bold">{value}</div>
              <div className="mt-0.5 text-xs text-ink-2">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_400px]">
        <div className="relative overflow-hidden rounded-[22px] border border-paper-line bg-[var(--map-bg)] lg:sticky lg:top-24 lg:h-[620px]">
          <div className="aspect-[1000/640] lg:aspect-auto lg:h-full">
            <CourtMap courts={visible} region={region} selected={selected} activeCounts={activeCounts} onSelect={onSelect} />
          </div>
          <div className="absolute left-3 top-3 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 rounded-full bg-paper/90 px-2.5 py-1"><span className="h-2.5 w-2.5 rounded-full bg-ball" />Outdoor</span>
            <span className="flex items-center gap-1.5 rounded-full bg-paper/90 px-2.5 py-1"><span className="h-2.5 w-2.5 rounded-full bg-sky" />Indoor</span>
            <span className="flex items-center gap-1.5 rounded-full bg-paper/90 px-2.5 py-1"><span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-ball" />Unconfirmed</span>
          </div>
        </div>

        <div className="min-w-0">
          {sel ? <CourtDetail court={sel} onClose={() => setSelected(undefined)} /> : (
            <div>
              <div className="eyebrow mb-2">{visible.length} courts in {region}</div>
              {visible.length === 0 && <p className="rounded-xl border border-dashed border-ink/20 p-6 text-sm text-ink-2">No courts match those filters. Clear one, or add a court we&apos;re missing.</p>}
              <ul className="space-y-1">
                {visible.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => setSelected(c.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface/70">
                      <span className={`h-3 w-3 shrink-0 rounded-full ${c.indoor ? "bg-sky" : "bg-ball"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{c.name}</span>
                        <span className="block text-sm text-ink-2">{distLabel(c)}{kings[c.id] ? `. Most wins: ${nick(kings[c.id]!.id)}, ${kings[c.id]!.value}` : ". No confirmed games yet"}</span>
                      </span>
                      {(activeCounts[c.id] ?? 0) > 0 ? <span className="num rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-paper">{activeCounts[c.id]} runs</span> : <CourtBadge v={c.verification} />}
                    </button>
                  </li>
                ))}
              </ul>
              {state.courtSubmissions.length > 0 && (
                <div className="mt-6 rounded-xl bg-sun-soft/60 p-4">
                  <div className="eyebrow mb-2">Your submissions</div>
                  {state.courtSubmissions.map((s) => (
                    <div key={s.id} className="rounded-lg border border-paper-line/70 bg-paper/60 p-3 text-sm">
                      <b>{s.kind === "new_court" ? s.name : `Correction, ${state.courts.find((c) => c.id === s.courtId)?.name}`}</b>
                      <div className="mt-1 text-xs text-ink-2">Pending community review</div>
                      {s.address && <div className="mt-2 text-xs"><span className="font-semibold">Suggested address:</span> {s.address}</div>}
                      <div className="mt-1 text-xs text-ink-2">{s.details}</div>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-6 text-xs leading-relaxed text-ink-3">ruNit does not know every court. Locations start as imported open map data and become verified only when players who play there confirm them.</p>
            </div>
          )}
        </div>
      </div>

      {adding && <AddCourt onClose={() => setAdding(false)} region={region} />}
    </div>
  );
}

function CourtDetail({ court: c, onClose }: { court: Court; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [fix, setFix] = useState("");
  const [fixAddress, setFixAddress] = useState("");
  const [sent, setSent] = useState(false);
  const addressSuggestion = fixAddress.trim();
  const correctionReady = fix.trim().length >= 8 || addressSuggestion.length >= 5;
  const correctionAddressInvalid = addressSuggestion.length > 0 && addressSuggestion.length < 5;
  const runs = state.runs.filter((r) => r.courtId === c.id && !["final", "reviewed"].includes(r.status) && (r.visibility === "public" || r.participants.includes(state.meId)));
  return (
    <div className="rise">
      <div className={`relative overflow-hidden rounded-2xl p-5 ${c.indoor ? "bg-sky-soft" : "bg-sun-soft"}`}>
        <svg viewBox="0 0 200 90" className="pointer-events-none absolute -bottom-6 -right-6 h-24 opacity-15" aria-hidden>
          <rect x="2" y="2" width="196" height="86" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M100 2v86M2 30h40v30H2M198 30h-40v30h40" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="45" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <button onClick={onClose} aria-label="Close court details" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-paper/80"><I.X width={16} height={16} /></button>
        <div className="eyebrow">{c.neighborhood}, {c.city}</div>
        <h2 className="display mt-1 text-[2.3rem]">{c.name}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2"><CourtBadge v={c.verification} /><span className="text-xs text-ink-2">{c.confirmations} player confirmations</span></div>
        <p className="mt-2 text-xs text-ink-2">{courtVerificationTip(c.verification)}</p>
      </div>

      <div className="mt-4 rounded-xl border border-paper-line bg-surface/60 p-3">
        <div className="eyebrow mb-1">Court location</div>
        <p className="text-sm font-semibold">{c.address || "Street address not listed"}</p>
        <p className="mt-1 text-xs text-ink-2">{c.address ? `${c.neighborhood}, ${c.city}` : `${c.neighborhood}, ${c.city} · approximate map pin`}</p>
        <a className="mt-3 inline-flex text-sm font-semibold text-ball-ink underline" href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`} target="_blank" rel="noreferrer">Get directions</a>
        <span className="ml-3 text-xs text-ink-3">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-paper-line bg-paper-line text-sm">
        {[
          ["Type", c.indoor ? "Indoor" : "Outdoor"],
          ["Surface", c.surface],
          ["Lights", c.lights ? "Yes" : "No"],
          ["Hoops", String(c.hoops)],
          ["Access", c.access === "public" ? "Public" : c.access === "membership" ? "Membership / day pass" : "After school hours"],
          ["Accessible", c.accessible ? "Step-free" : "Not confirmed"],
        ].map(([k, v]) => (
          <div key={k} className="bg-paper px-3 py-2.5"><dt className="text-[11px] text-ink-3">{k}</dt><dd className="font-semibold">{v}</dd></div>
        ))}
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5">{c.amenities.map((a) => <span key={a} className="chip">{a}</span>)}</div>
      <p className="mt-3 text-sm text-ink-2">“{c.note}”</p>

      <div className="mt-5 flex items-center justify-between">
        <div className="eyebrow">Runs here</div>
        <Link href={`/create?court=${c.id}`} className="text-sm font-semibold text-ball-ink">Call one here</Link>
      </div>
      {runs.length ? <ul className="mt-2 space-y-2">{runs.map((r) => (
        <li key={r.id}><Link href={`/runs/${r.id}`} className="flex items-center gap-3 rounded-xl border border-paper-line bg-surface/60 px-3 py-2.5 hover:border-ink/30">
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{r.title}</span><span className="block text-xs text-ink-3">{when(r.startsAt)}, {r.format}, {r.mode}</span></span>
          <span className="num text-xs text-ink-2">{r.participants.length}/{r.capacity}</span><I.Chevron width={16} height={16} className="text-ink-3" />
        </Link></li>))}</ul> : <p className="mt-2 text-sm text-ink-3">Nothing scheduled. Quiet court — good time to call a run.</p>}

      <GotNext courtId={c.id} />

      <CourtRecords courtId={c.id} />

      <div className="mt-8 border-t-2 border-ink pt-4">
        <div className="eyebrow mb-2">Something wrong here?</div>
        {sent ? (
          <p className="text-sm text-emerald">Thanks — your correction is queued for community review. The current listing stays unchanged until the suggestion is verified.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (!correctionReady || correctionAddressInvalid) return; dispatch({ type: "courtSubmission", sub: { id: `cs-${Date.now()}`, kind: "correction", courtId: c.id, address: addressSuggestion || undefined, details: fix.trim() || "Suggested court address correction.", at: new Date().toISOString(), status: "pending_review" } }); setSent(true); }}>
            <div className="mb-3">
              <label className="label" htmlFor="court-address-fix">Suggest a corrected street address or cross streets (optional)</label>
              <input id="court-address-fix" className="field text-sm" value={fixAddress} onChange={(e) => setFixAddress(e.target.value)} placeholder="e.g. 100 Main St, or Main St & 2nd Ave" />
              {correctionAddressInvalid && <p className="mt-1 text-xs text-warn">Enter at least five characters, or clear this field.</p>}
            </div>
            <label className="label" htmlFor="court-fix-details">Other correction details</label>
            <textarea id="court-fix-details" className="field min-h-[72px] text-sm" placeholder="e.g. The entrance is on the Elm Street side. Lights are on until 11pm." value={fix} onChange={(e) => setFix(e.target.value)} />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] text-ink-3">{correctionReady && !correctionAddressInvalid ? "Ready for review" : "Add a note or corrected address"}</span>
              <button className="btn-line py-1.5" disabled={!correctionReady || correctionAddressInvalid}>Submit correction</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AddCourt({ onClose, region }: { onClose: () => void; region: Region }) {
  const { dispatch } = useStore();
  const [name, setName] = useState("");
  const [indoor, setIndoor] = useState(false);
  const [hoops, setHoops] = useState(2);
  const [address, setAddress] = useState("");
  const [details, setDetails] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) return setErr("Give the court a name people would recognize.");
    if (address.trim().length < 5) return setErr("Add a street address or clear cross streets so players can find it.");
    if (details.trim().length < 10) return setErr("Add a landmark or directions to help players find the entrance.");
    dispatch({ type: "courtSubmission", sub: { id: `cs-${Date.now()}`, kind: "new_court", name: name.trim(), address: address.trim(), city: region, details: `${indoor ? "Indoor" : "Outdoor"}, ${hoops} hoops. ${details.trim()}`, at: new Date().toISOString(), status: "pending_review" } });
    setDone(true);
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-night/60 p-0 sm:place-items-center sm:p-6" onClick={onClose}>
      <div className="rise w-full max-w-md rounded-t-3xl bg-paper p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add a missing court">
        <div className="flex items-center justify-between"><h2 className="display text-[2rem]">Add a court</h2><DemoTag /></div>
        {done ? (
          <div className="mt-4">
            <p className="text-sm text-ink-2"><b className="text-ink">{name}</b> is submitted. It shows as <b>Submitted</b> until five players confirm it&apos;s real and playable.</p>
            <button className="btn-ink mt-5 w-full" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div><label className="label" htmlFor="cn">Court name</label><input id="cn" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Church St playground" /></div>
            <div><label className="label" htmlFor="court-address">Street address or cross streets</label><input id="court-address" className="field" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 100 Main St, or Main St & 2nd Ave" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="label">Type</span>
                <div className="flex gap-2">{[false, true].map((v) => <button type="button" key={String(v)} className={`chip flex-1 justify-center py-2 ${indoor === v ? "chip-on" : ""}`} onClick={() => setIndoor(v)}>{v ? "Indoor" : "Outdoor"}</button>)}</div>
              </div>
              <div><label className="label" htmlFor="hp">Hoops</label><input id="hp" type="number" min={1} max={12} className="field" value={hoops} onChange={(e) => setHoops(Math.max(1, Math.min(12, +e.target.value || 1)))} /></div>
            </div>
            <div><label className="label" htmlFor="cd">Where is it?</label><textarea id="cd" className="field min-h-[80px]" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Nearby landmark, entrance instructions, parking, or other directions" /></div>
            <p className="text-xs text-ink-3">In the live app you&apos;d drop a pin. Only submit a public court location. Never submit a private home address.</p>
            {err && <p className="text-sm font-semibold text-warn" role="alert">{err}</p>}
            <div className="flex gap-2"><button type="button" className="btn-line flex-1" onClick={onClose}>Cancel</button><button className="btn-ball flex-1">Submit court</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
