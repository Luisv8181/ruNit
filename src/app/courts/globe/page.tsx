"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { courtRecords, passport } from "@/lib/records";
import { BallGlobe, OSM_MIN_ZOOM, type GlobeHandle, type GlobePin, type GlobeView } from "@/components/BallGlobe";
import { courtsInView, fineDensity, loadCourtIndex, loadSnapshotTile, osmUrl, snapshotCourtId, snapshotCourtUrl, snapshotTilesFor, type CourtIndex, type OsmCourt, type SnapshotPoint } from "@/lib/osm";
import { BackLink, CourtBadge } from "@/components/ui";
import { Avatar } from "@/components/PlayerFigure";

const PLACES = [
  { label: "World view", lng: -40, lat: 20, zoom: 1 },
  { label: "Hazleton", lng: -75.979, lat: 40.956, zoom: 1700 },
  { label: "Scranton", lng: -75.656, lat: 41.413, zoom: 1700 },
  { label: "New York", lng: -73.98, lat: 40.74, zoom: 1000 },
  { label: "Los Angeles", lng: -118.25, lat: 34.05, zoom: 1000 },
  { label: "London", lng: -0.13, lat: 51.51, zoom: 1000 },
  { label: "Tokyo", lng: 139.69, lat: 35.68, zoom: 1000 },
  { label: "Manila", lng: 120.98, lat: 14.6, zoom: 1000 },
];

export default function GlobePage() {
  const { state, player, dispatch } = useStore();
  const [osm, setOsm] = useState<OsmCourt[]>([]);
  const [status, setStatus] = useState<{ kind: "far" | "loading" | "ok" | "error" | "partial" | "wide"; n?: number }>({ kind: "far" });
  const [snapshot, setSnapshot] = useState<CourtIndex | null>(null);
  const [snapshotChecked, setSnapshotChecked] = useState(false);
  const [points, setPoints] = useState<SnapshotPoint[]>([]);
  const loadedTiles = useRef(new Set<string>());
  const [added, setAdded] = useState<string[]>([]);
  const ctrl = useRef<AbortController | null>(null);
  const lastView = useRef<GlobeView | null>(null);

  useEffect(() => { loadCourtIndex().then(setSnapshot).finally(() => setSnapshotChecked(true)); }, []);
  const density = useMemo(() => snapshot ? { coarse: snapshot.coarse, medium: snapshot.medium, fine: fineDensity(points) } : undefined, [snapshot, points]);

  // Individual courts arrive by region once the view is close enough to need them.
  const loadTiles = useCallback(async (v: GlobeView) => {
    if (!snapshot || v.zoom < 40) return;
    const keys = snapshotTilesFor(snapshot, v.s, v.w, v.n, v.e, loadedTiles.current);
    if (!keys.length) return;
    keys.forEach((k) => loadedTiles.current.add(k));
    const got = await Promise.all(keys.map((k) => loadSnapshotTile(k).catch(() => { loadedTiles.current.delete(k); return [] as SnapshotPoint[]; })));
    const fresh = got.flat();
    if (fresh.length) setPoints((prev) => [...prev, ...fresh].sort((a, b) => a[0] - b[0]));
  }, [snapshot]);

  const load = useCallback(async (v: GlobeView) => {
    lastView.current = v;
    loadTiles(v);
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
  }, [loadTiles]);
  const globe = useRef<GlobeHandle>(null);
  const [selected, setSelected] = useState<string | undefined>();
  const stamps = useMemo(() => passport(state.meId, state.courts, state.courtGames), [state]);
  const pins: GlobePin[] = useMemo(() => state.courts.map((c) => ({
    id: c.id, name: c.name, lat: c.lat, lng: c.lng, kind: c.indoor ? "indoor" : "outdoor",
    stamped: stamps.find((s) => s.courtId === c.id)?.status === "won",
    group: ["Hazleton", "West Hazleton"].includes(c.city) ? "Hazleton" : "Scranton",
  })), [state.courts, stamps]);
  const sel = state.courts.find((c) => c.id === selected);
  const selOsm = osm.find((o) => o.id === selected);
  const selSnap = useMemo(() => selected ? points.find((point) => snapshotCourtId(point) === selected) : undefined, [selected, points]);
  const rec = sel ? courtRecords(sel.id, state.courtGames) : undefined;
  const king = rec?.mostWins ? player(rec.mostWins.id) : undefined;

  return (
    <div>
      <BackLink href="/courts" label="Courts" />
      <header className="mb-7 border-b-2 border-ink pb-7 sm:mb-9 sm:pb-9">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.16em]">
          <p>RUN IT <span className="mx-1 text-ball-ink">/</span> COURT ATLAS</p>
          <p className="text-ink-2">THE WORLD IS IN PLAY</p>
        </div>
        <div className="mt-5 grid items-end gap-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-10">
          <h1 className="display max-w-[850px] text-[clamp(3.6rem,8vw,7.8rem)] uppercase leading-[0.82] tracking-[-0.035em]">
            Find your<br />next court<span className="text-ball-ink">.</span>
          </h1>
          <div className="max-w-[32rem] lg:pb-1">
            <p className="text-xl font-bold leading-tight sm:text-2xl">The game has a place. Find yours.</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">Explore basketball courts mapped around the world. Pick a city or spin the globe to see where people play.</p>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 items-start gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="aspect-square min-w-0 w-full max-w-[760px] lg:sticky lg:top-24">
          <BallGlobe ref={globe} pins={pins} osm={osm} density={density} snapshot={points} selected={selected} onViewSettled={load}
            onSelect={(id) => {
              setSelected(id);
              const c = state.courts.find((x) => x.id === id) ?? osm.find((x) => x.id === id);
              const point = c ? undefined : points.find((x) => snapshotCourtId(x) === id);
              if (c) globe.current?.flyTo(c.lng, c.lat, 2600);
              else if (point) globe.current?.flyTo(point[1], point[0], 2600);
            }} />
        </div>

        <aside className="min-w-0">
          <div className="border-t-[5px] border-ink pt-4">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-ink-2">COURTS ON THE MAP</p>
            <p className="display mt-2 text-[clamp(3.25rem,6vw,5rem)] leading-none">{snapshot ? snapshot.count.toLocaleString() : snapshotChecked ? "—" : "…"}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-wider">
              <span>{snapshot ? snapshot.region : snapshotChecked ? "Live city lookup" : "Loading"}</span>
              <span className="text-ink-2">{snapshot ? `OSM · ${new Date(snapshot.fetchedAt).toLocaleDateString()}` : "OpenStreetMap"}</span>
            </div>
          </div>

          <div className="mt-8 border-t border-ink/25 pt-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-ink-2">PICK A STARTING POINT</p>
            <p className="mt-2 text-sm text-ink-2">Choose a city. Then get closer.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {PLACES.map((p) => (
              <button key={p.label} className={`rounded-full border px-3.5 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${p.label === "World view" ? "border-ink bg-ink text-paper hover:bg-ink/85" : "border-ink/25 text-ink hover:border-ink hover:bg-ink/5"}`} onClick={() => { setSelected(undefined); globe.current?.flyTo(p.lng, p.lat, p.zoom); }}>{p.label}</button>
            ))}
          </div>

          <p className="mt-6 min-h-[1.5rem] border-l-4 border-ball pl-3 text-sm font-semibold text-ink-2" role="status" aria-live="polite">
            {status.kind === "far" && (snapshot ? <>Tap a cluster to zoom from region to street.</> : <>Zoom into a city to load mapped courts.</>)}
            {status.kind === "loading" && <>Finding courts in this area…</>}
            {status.kind === "ok" && <><b className="text-ink">{status.n}</b> {status.n === 1 ? "court" : "courts"} in view. Pick one.</>}
            {status.kind === "partial" && <><b>{status.n}</b> courts loaded. Part of this area didn&apos;t load. <button className="font-semibold underline" onClick={() => lastView.current && load(lastView.current)}>Try again</button></>}
            {status.kind === "wide" && <>Zoom in closer to load individual court details.</>}
            {status.kind === "error" && <>Fresh court details are unavailable. Snapshot locations are still shown. <button className="font-semibold underline" onClick={() => lastView.current && load(lastView.current)}>Try again</button>.</>}
          </p>

          {selOsm ? (
            <section className="rise mt-6 border-t-2 border-ink pt-4" aria-live="polite">
              <p className="text-[15px] text-ink-2">From OpenStreetMap</p>
              <h2 className="display text-[2.4rem]">{selOsm.name ?? "Basketball court"}</h2>
              <p className="mt-3 text-[15px]">
                {selOsm.indoor ? "Indoor" : "Outdoor"}{selOsm.surface ? `, ${selOsm.surface.replace(/_/g, " ")}` : ""}{selOsm.hoops ? `, ${selOsm.hoops} ${selOsm.hoops === "1" ? "hoop" : "hoops"}` : ""}{selOsm.lit === true ? ", lights" : selOsm.lit === false ? ", no lights" : ""}{selOsm.access && selOsm.access !== "yes" ? `, access: ${selOsm.access}` : ""}.
              </p>
              <p className="mt-2 text-sm text-ink-2">Not on RUN IT yet, so there are no runs or records here.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {added.includes(selOsm.id) ? (
                  <span className="btn bg-emerald-soft text-emerald">Submitted for review</span>
                ) : (
                  <button className="btn-ball" onClick={() => { dispatch({ type: "courtSubmission", sub: { id: `cs-${Date.now()}`, kind: "new_court", name: selOsm.name ?? "Basketball court", city: "", details: `From OpenStreetMap ${selOsm.osmType}/${selOsm.osmId} at ${selOsm.lat.toFixed(5)}, ${selOsm.lng.toFixed(5)}`, at: new Date().toISOString(), status: "pending_review" } }); setAdded((a) => [...a, selOsm.id]); }}>Add to RUN IT</button>
                )}
                <a href={osmUrl(selOsm)} target="_blank" rel="noreferrer" className="btn-line">View on OpenStreetMap</a>
              </div>
            </section>
          ) : selSnap ? (
            <section className="rise mt-6 border-t-2 border-ink pt-4" aria-live="polite">
              <p className="text-[15px] text-ink-2">Mapped by OpenStreetMap</p>
              <h2 className="display text-[2.4rem]">Basketball court</h2>
              <p className="mt-3 text-[15px]">Location: {selSnap[0].toFixed(5)}, {selSnap[1].toFixed(5)}. Detailed tags are loading or unavailable right now.</p>
              <a href={snapshotCourtUrl(selSnap)} target="_blank" rel="noreferrer" className="btn-line mt-5 inline-flex">View on OpenStreetMap</a>
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
            <section className="mt-9 border-t-2 border-ink pt-5">
              <h2 className="display text-[1.8rem] uppercase">Map key</h2>
              <ul className="mt-4 grid gap-3 text-sm font-semibold">
                <li className="flex items-center gap-3"><span className="h-4 w-4 shrink-0 rounded-full border-2 border-ink bg-paper" />Mapped basketball court</li>
                <li className="flex items-center gap-3"><span className="h-4 w-4 shrink-0 rounded-full border-2 border-paper bg-emerald ring-1 ring-ink/30" />RUN IT outdoor demo court</li>
                <li className="flex items-center gap-3"><span className="h-4 w-4 shrink-0 rounded-full border-2 border-paper bg-[#E7BE86] ring-1 ring-ink/30" />RUN IT indoor demo court</li>
                <li className="flex items-center gap-3"><span className="h-4 w-4 shrink-0 rounded-full border-[3px] border-sun" />Court in your passport</li>
              </ul>
              <p className="mt-5 text-xs leading-relaxed text-ink-2">Drag to spin · scroll or pinch to zoom · arrow keys to rotate · + / − to zoom</p>
            </section>
          )}

          <p className="mt-9 border-t border-ink/20 pt-4 text-xs leading-relaxed text-ink-2">Court locations come from OpenStreetMap. The count reflects mapped basketball pitches, and coverage varies by place. RUN IT player courts are labeled demo data.</p>
        </aside>
      </div>
    </div>
  );
}
