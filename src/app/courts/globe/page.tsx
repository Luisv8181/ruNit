"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { courtRecords, passport } from "@/lib/records";
import { BallGlobe, OSM_MIN_ZOOM, type GlobeHandle, type GlobePin, type GlobeView } from "@/components/BallGlobe";
import { courtsInView, loadSnapshot, osmUrl, type OsmCourt } from "@/lib/osm";
import { BackLink, CourtBadge } from "@/components/ui";
import { Avatar } from "@/components/PlayerFigure";

const PLACES = [
  { label: "Hazleton", lng: -75.979, lat: 40.956, zoom: 1700 },
  { label: "Scranton", lng: -75.656, lat: 41.413, zoom: 1700 },
  { label: "Pennsylvania", lng: -77.6, lat: 40.9, zoom: 9 },
  { label: "Whole planet", lng: -40, lat: 20, zoom: 1 },
];

export default function GlobePage() {
  const { state, player, dispatch } = useStore();
  const [osm, setOsm] = useState<OsmCourt[]>([]);
  const [status, setStatus] = useState<{ kind: "far" | "loading" | "ok" | "error" | "partial" | "wide"; n?: number }>({ kind: "far" });
  const [snapshot, setSnapshot] = useState<{ points: [number, number][]; region: string; fetchedAt: string } | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [view, setView] = useState<GlobeView | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const lastView = useRef<GlobeView | null>(null);

  useEffect(() => { loadSnapshot().then(setSnapshot); }, []);

  const load = useCallback(async (v: GlobeView) => {
    lastView.current = v;
    if (v.zoom < OSM_MIN_ZOOM) { setStatus({ kind: "far" }); return; }
    ctrl.current?.abort();
    const c = new AbortController(); ctrl.current = c;
    setStatus({ kind: "loading" });
    try {
      const r = await courtsInView(v.s, v.w, v.n, v.e, c.signal);
      if (r.skipped) return setStatus({ kind: "wide" });
      setOsm((prev) => { const m = new Map(prev.map((x) => [x.id, x])); r.courts.forEach((x) => m.set(x.id, x)); return [...m.values()]; });
      setStatus(r.failed === r.tiles ? { kind: "error" } : r.failed ? { kind: "partial", n: r.courts.length } : { kind: "ok", n: r.courts.length });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus({ kind: "error" });
    }
  }, []);
  const globe = useRef<GlobeHandle>(null);
  const [selected, setSelected] = useState<string | undefined>();
  const stamps = useMemo(() => passport(state.meId, state.courts, state.courtGames), [state]);
  const pins: GlobePin[] = useMemo(() => state.courts.map((c) => ({
    id: c.id, name: c.name, lat: c.lat, lng: c.lng, kind: c.indoor ? "indoor" : "outdoor",
    stamped: stamps.find((s) => s.courtId === c.id)?.status === "won",
    group: ["Hazleton", "West Hazleton"].includes(c.city) ? "Hazleton" : "Scranton",
  })), [state.courts, stamps]);
  const inBounds = (lat: number, lng: number) => !view || (lat >= view.s && lat <= view.n && (view.w <= view.e ? lng >= view.w && lng <= view.e : lng >= view.w || lng <= view.e));
  const osmVisible = osm.filter((c) => inBounds(c.lat, c.lng));
  const ruNitVisible = state.courts.filter((c) => inBounds(c.lat, c.lng));
  const activeRuns = state.runs.filter((r) => !["final", "reviewed"].includes(r.status));
  const localActiveRuns = activeRuns.filter((r) => ruNitVisible.some((c) => c.id === r.courtId));
  const sel = state.courts.find((c) => c.id === selected);
  const selOsm = osm.find((o) => o.id === selected);
  const rec = sel ? courtRecords(sel.id, state.courtGames) : undefined;
  const king = rec?.mostWins ? player(rec.mostWins.id) : undefined;

  return (
    <div>
      <BackLink href="/courts" label="Courts" />
      <div className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="aspect-square w-full max-w-[760px] lg:sticky lg:top-24">
          <BallGlobe ref={globe} pins={pins} osm={osm} density={snapshot?.points} selected={selected} onViewSettled={(v) => { setView(v); load(v); }}
            onSelect={(id) => { setSelected(id); const c = state.courts.find((x) => x.id === id) ?? osm.find((x) => x.id === id); if (c) globe.current?.flyTo(c.lng, c.lat, 2600); }} />
        </div>

        <div>
          <h1 className="display text-[clamp(3rem,7vw,5rem)]">The ball is round</h1>
          <p className="mt-3 text-lg text-ink-2">Every court we know about, pinned to a basketball the size of the Earth. Drag it, spin it, zoom in until you find your court.</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {PLACES.map((p) => (
              <button key={p.label} className="chip px-4 py-2 text-[15px]" onClick={() => { setSelected(undefined); globe.current?.flyTo(p.lng, p.lat, p.zoom); }}>{p.label}</button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2" aria-label="Court network in current view">\n            <div className="rounded-xl border border-paper-line bg-surface/70 p-3"><div className="num text-2xl font-bold">{ruNitVisible.length}</div><div className="text-xs text-ink-2">ruNit courts</div></div>\n            <div className="rounded-xl border border-paper-line bg-surface/70 p-3"><div className="num text-2xl font-bold">{osmVisible.length}</div><div className="text-xs text-ink-2">OSM courts loaded</div></div>\n            <div className="rounded-xl border border-paper-line bg-surface/70 p-3"><div className="num text-2xl font-bold">{localActiveRuns.length}</div><div className="text-xs text-ink-2">Active runs</div></div>\n          </div>\n          {localActiveRuns.length > 0 && <div className="mt-3 rounded-xl border border-paper-line p-3"><div className="eyebrow mb-2">Runs happening in ruNit courts here</div><ul className="space-y-2">{localActiveRuns.slice(0, 3).map((r) => <li key={r.id}><Link href={`/runs/${r.id}`} className="flex items-center justify-between gap-3 text-sm hover:underline"><span className="min-w-0 truncate font-semibold">{r.title}</span><span className="shrink-0 text-xs text-ink-2">{r.participants.length}/{r.capacity} players</span></Link></li>)}</ul></div>}\n          <p className="mt-3 min-h-[1.5rem] text-[15px]" role="status" aria-live="polite">
            {status.kind === "far" && (snapshot ? <>Global density layer: {snapshot.points.length.toLocaleString()} mapped court locations in {snapshot.region}. Snapshot updated {new Date(snapshot.fetchedAt).toLocaleDateString()}. Zoom in to load court details.</> : <>Global density snapshot is not installed. Live OpenStreetMap courts load as you zoom into a city; a regional or global snapshot can be generated with the court import script.</>)}
            {status.kind === "loading" && <>Loading courts from OpenStreetMap…</>}
            {status.kind === "ok" && <><b>{status.n}</b> OpenStreetMap {status.n === 1 ? "court" : "courts"} in view.</>}
            {status.kind === "partial" && <><b>{status.n}</b> courts loaded. Part of this area didn&apos;t load. <button className="font-semibold underline" onClick={() => lastView.current && load(lastView.current)}>Try again</button></>}
            {status.kind === "wide" && <>That&apos;s a big area. Zoom in a little more to load courts.</>}
            {status.kind === "error" && <>Couldn&apos;t reach OpenStreetMap. Check your connection, then <button className="font-semibold underline" onClick={() => lastView.current && load(lastView.current)}>try again</button>.</>}
          </p>

          {selOsm ? (
            <section className="rise mt-6 border-t-2 border-ink pt-4" aria-live="polite">
              <p className="text-[15px] text-ink-2">From OpenStreetMap</p>
              <h2 className="display text-[2.4rem]">{selOsm.name ?? "Basketball court"}</h2>
              <p className="mt-3 text-[15px]">
                {selOsm.indoor ? "Indoor" : "Outdoor"}{selOsm.surface ? `, ${selOsm.surface.replace(/_/g, " ")}` : ""}{selOsm.hoops ? `, ${selOsm.hoops} ${selOsm.hoops === "1" ? "hoop" : "hoops"}` : ""}{selOsm.lit === true ? ", lights" : selOsm.lit === false ? ", no lights" : ""}{selOsm.access && selOsm.access !== "yes" ? `, access: ${selOsm.access}` : ""}.
              </p>
              <p className="mt-2 text-sm text-ink-2">Not on ruNit yet, so there are no runs or records here.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {added.includes(selOsm.id) ? (
                  <span className="btn bg-emerald-soft text-emerald">Submitted for review</span>
                ) : (
                  <button className="btn-ball" onClick={() => { dispatch({ type: "courtSubmission", sub: { id: `cs-${Date.now()}`, kind: "new_court", name: selOsm.name ?? "Basketball court", city: "", details: `From OpenStreetMap ${selOsm.osmType}/${selOsm.osmId} at ${selOsm.lat.toFixed(5)}, ${selOsm.lng.toFixed(5)}`, at: new Date().toISOString(), status: "pending_review" } }); setAdded((a) => [...a, selOsm.id]); }}>Add to ruNit</button>
                )}
                <a href={osmUrl(selOsm)} target="_blank" rel="noreferrer" className="btn-line">View on OpenStreetMap</a>
              </div>
            </section>
          ) : sel && rec ? (
            <section className="rise mt-8 border-t-2 border-ink pt-4" aria-live="polite">
              <p className="text-[15px] text-ink-2">{sel.neighborhood}, {sel.city}</p>
              <h2 className="display text-[2.4rem]">{sel.name}</h2>
              <div className="mt-2"><CourtBadge v={sel.verification} /></div>
              <p className="mt-3 text-[15px]">{sel.indoor ? "Indoor" : "Outdoor"}, {sel.surface.toLowerCase()}, {sel.hoops} {sel.hoops === 1 ? "hoop" : "hoops"}{sel.lights ? ", lights" : ""}.</p>
              {king && rec.mostWins ? (
                <div className="mt-4 flex items-center gap-3">
                  <Avatar config={king.character} size={40} />
                  <p className="text-[15px]"><b>{rec.mostWins.id === state.meId ? "You" : king.nickname}</b> holds the record here with <b>{rec.mostWins.value}</b> confirmed wins.</p>
                </div>
              ) : <p className="mt-4 text-[15px] text-ink-2">No confirmed games yet. The first win here sets the record.</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/courts?c=${sel.id}`} className="btn-ball">Open court</Link>
                <Link href={`/create?court=${sel.id}`} className="btn-line">Call a run here</Link>
              </div>
            </section>
          ) : (
            <section className="mt-8 border-t-2 border-ink pt-4">
              <h2 className="display text-[1.8rem]">How to read it</h2>
              <ul className="mt-3 space-y-3 text-[15px]">
                <li className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-sm font-bold text-paper">5</span>A city. Tap it to fly in.</li>
                <li className="flex items-center gap-3"><span className="h-5 w-5 rounded-full border-[3px] border-paper bg-emerald ring-1 ring-ink/20" />Outdoor court</li>
                <li className="flex items-center gap-3"><span className="h-5 w-5 rounded-full border-[3px] border-paper bg-[#E7BE86] ring-1 ring-ink/20" />Indoor court</li>
                <li className="flex items-center gap-3"><span className="h-5 w-5 rounded-full border-4 border-sun" />A court in your passport</li>
                <li className="flex items-center gap-3"><span className="h-3.5 w-3.5 rounded-full border-2 border-ink bg-paper" />A real court from OpenStreetMap</li>
              </ul>
              <p className="mt-4 text-sm text-ink-2">Keyboard: arrow keys spin the ball, plus and minus zoom.</p>
            </section>
          )}

          <section className="mt-8 border-t-2 border-ink pt-4">\n            <h2 className="display text-[1.8rem]">The network, at this zoom</h2>\n            <p className="mt-2 text-sm text-ink-2">Counts reflect the visible map bounds. OpenStreetMap locations are mapped courts, not ruNit-verified venues. ruNit courts, runs, and records are community features; demo content is labeled in the app.</p>\n            <div className="mt-4 flex flex-wrap gap-2">\n              <Link href="/courts" className="btn-line">Open local court map</Link>\n              <Link href="/community" className="btn-line">Find players & squads</Link>\n            </div>\n          </section>\n          <p className="mt-6 text-xs text-ink-3">Dark pins are ruNit demo courts. Light pins are OpenStreetMap courts loaded for the current area. Coverage depends on what contributors have mapped and should not be treated as a complete inventory.</p>
        </div>
      </div>
    </div>
  );
}
