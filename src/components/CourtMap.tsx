"use client";

// Two renderers behind one interface:
//  - DemoMap: offline, stylized SVG (no tiles, no keys). Streets are decorative, not real.
//  - LiveMap: MapLibre GL with a configurable style URL (NEXT_PUBLIC_MAP_STYLE_URL).

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Court } from "@/lib/types";
import { MAP_STYLE_URL } from "@/lib/backend";
import { DEMO_HOME } from "@/lib/util";

export type Region = "Hazleton" | "Scranton";
export const REGIONS: Record<Region, { lat: [number, number]; lng: [number, number] }> = {
  Hazleton: { lat: [40.938, 40.973], lng: [-76.014, -75.955] },
  Scranton: { lat: [41.393, 41.433], lng: [-75.677, -75.62] },
};

interface Props {
  courts: Court[];
  region: Region;
  selected?: string;
  activeCounts: Record<string, number>;
  onSelect: (id: string) => void;
}

// Keyless street tiles straight from OpenStreetMap, for the optional "Streets" view.
const OSM_STYLE = {
  version: 8 as const,
  sources: { osm: { type: "raster" as const, tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap contributors" } },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

export function CourtMap(props: Props) {
  const [streets, setStreets] = useState(false);
  const live = !!MAP_STYLE_URL || streets;
  return (
    <div className="relative h-full w-full">
      {live ? <LiveMap {...props} /> : <DemoMap {...props} />}
      {!MAP_STYLE_URL && (
        <div className="absolute bottom-3 left-3 z-10 flex rounded-full sm:bottom-auto sm:left-auto sm:right-3 sm:top-3 bg-paper/90 p-1 text-[13px] font-bold shadow" role="group" aria-label="Map style">
          <button aria-pressed={!streets} onClick={() => setStreets(false)} className={`rounded-full px-3 py-1 ${!streets ? "bg-ball text-on-ball" : "text-ink-2"}`}>Demo</button>
          <button aria-pressed={streets} onClick={() => setStreets(true)} className={`rounded-full px-3 py-1 ${streets ? "bg-ball text-on-ball" : "text-ink-2"}`}>Streets</button>
        </div>
      )}
    </div>
  );
}

function DemoMap({ courts, region, selected, activeCounts, onSelect }: Props) {
  const W = 1000, H = 640;
  const b = REGIONS[region];
  const proj = (lat: number, lng: number) => ({
    x: ((lng - b.lng[0]) / (b.lng[1] - b.lng[0])) * W,
    y: H - ((lat - b.lat[0]) / (b.lat[1] - b.lat[0])) * H,
  });
  // Deterministic decorative street grid per region.
  const streets = useMemo(() => {
    const seed = region === "Hazleton" ? 7 : 13;
    const lines: string[] = [];
    for (let i = 0; i < 16; i++) {
      const x = ((i * 67 + seed * 11) % 1040) - 20;
      lines.push(`M${x} -20 L ${x + 90 + (i % 3) * 20} ${H + 20}`);
    }
    for (let i = 0; i < 11; i++) {
      const y = ((i * 61 + seed * 5) % 680) - 10;
      lines.push(`M-20 ${y} L ${W + 20} ${y - 60 + (i % 4) * 14}`);
    }
    return lines;
  }, [region]);
  const home = proj(DEMO_HOME.lat, DEMO_HOME.lng);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="application" aria-label={`${region} court map`}>
      <rect width={W} height={H} style={{ fill: "var(--map-bg)" }} />
      {/* parks / greenery */}
      {region === "Hazleton" ? (
        <>
          <path d="M120 420 C 200 360, 330 380, 360 470 C 380 560, 210 600, 140 560 Z" style={{ fill: "var(--map-park)" }} />
          <path d="M640 80 C 760 40, 900 90, 880 190 C 860 260, 700 250, 650 190 Z" style={{ fill: "var(--map-park)" }} />
        </>
      ) : (
        <>
          <path d="M60 120 C 180 80, 260 140, 240 240 C 220 320, 90 300, 60 230 Z" style={{ fill: "var(--map-park)" }} />
          <path d="M700 380 C 820 340, 960 420, 930 520 C 900 600, 760 600, 720 520 Z" style={{ fill: "var(--map-park)" }} />
          {/* river */}
          <path d="M-20 520 C 200 470, 320 600, 520 560 C 720 520, 800 300, 1020 260" style={{ stroke: "var(--map-water)" }} strokeWidth="26" fill="none" strokeLinecap="round" />
        </>
      )}
      <g style={{ stroke: "var(--map-street)" }} strokeWidth="3">{streets.map((d, i) => <path key={i} d={d} />)}</g>
      <path d={region === "Hazleton" ? "M-20 300 C 300 260, 600 340, 1020 250" : "M300 -20 C 380 200, 420 420, 560 660"} style={{ stroke: "var(--map-road)" }} strokeWidth="10" fill="none" />

      {region === "Hazleton" && (
        <g transform={`translate(${home.x} ${home.y})`} aria-label="Your approximate area">
          <circle r="34" fill="#56B8E8" opacity=".12" />
          <circle r="7" fill="#56B8E8" stroke="#fff" strokeWidth="3" />
        </g>
      )}

      {courts.map((c) => {
        const p = proj(c.lat, c.lng);
        const on = selected === c.id;
        const active = activeCounts[c.id] ?? 0;
        const color = c.indoor ? "rgb(var(--c-sky))" : "rgb(var(--c-ball))";
        const verified = c.verification === "community_verified" || c.verification === "officially_verified";
        return (
          <g key={c.id} transform={`translate(${p.x} ${p.y})`} className="cursor-pointer" onClick={() => onSelect(c.id)} role="button" tabIndex={0} aria-label={`${c.name}${active ? `, ${active} active runs` : ""}`} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(c.id)}>
            {active > 0 && <circle r="30" fill={color} opacity=".18" className="holo-pulse" />}
            <circle r={on ? 20 : 15} fill={verified ? color : "var(--map-pin-off)"} stroke={color} strokeWidth={verified ? 0 : 3} strokeDasharray={c.verification === "imported" ? "4 3" : undefined} />
            {/* tiny hoop glyph */}
            <path d="M-6 -1h12M-4 -1l1.5 6h5L4 -1" stroke={verified ? "#fff" : color} strokeWidth="2" fill="none" strokeLinecap="round" />
            {active > 0 && (
              <g transform="translate(13 -13)">
                <circle r="10" style={{ fill: "var(--map-label)" }} />
                <text textAnchor="middle" dy="4" fontSize="11" fontWeight="700" style={{ fill: "var(--map-bg)" }}>{active}</text>
              </g>
            )}
            <text y={on ? 40 : 34} textAnchor="middle" fontSize={on ? 17 : 15} fontWeight={on ? 700 : 600} style={{ fill: "var(--map-label)", stroke: "var(--map-halo)" }} strokeWidth="4" paintOrder="stroke">{c.name}</text>
          </g>
        );
      })}
      <text x={W - 16} y={H - 14} textAnchor="end" fontSize="13" style={{ fill: "var(--map-label)", opacity: 0.6 }}>Stylized demo map, streets are decorative, court positions approximate</text>
    </svg>
  );
}

function LiveMap({ courts, region, selected, onSelect, activeCounts }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markers = useRef<import("maplibre-gl").Marker[]>([]);
  const pick = useRef(onSelect);
  pick.current = onSelect;
  const [ready, setReady] = useState(false);

  // One map per region; pins are redrawn separately so selecting a court never reloads tiles.
  useEffect(() => {
    let cancelled = false;
    let map: import("maplibre-gl").Map | null = null;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !el.current) return;
      maplibre.setWorkerUrl("/maplibre-gl-worker.mjs");
      const b = REGIONS[region];
      map = new maplibre.Map({ container: el.current, style: MAP_STYLE_URL || OSM_STYLE, bounds: [[b.lng[0], b.lat[0]], [b.lng[1], b.lat[1]]], fitBoundsOptions: { padding: 40 }, attributionControl: { compact: true } });
      mapRef.current = map;
      setReady(true);
    })();
    return () => { cancelled = true; setReady(false); markers.current = []; map?.remove(); mapRef.current = null; };
  }, [region]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let cancelled = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled) return;
      markers.current.forEach((m) => m.remove());
      markers.current = courts.map((c) => {
        const on = selected === c.id;
        const n = activeCounts[c.id] ?? 0;
        const verified = c.verification === "community_verified" || c.verification === "officially_verified";
        const node = document.createElement("button");
        node.className = "grid place-items-center rounded-full border-[3px] border-white text-[12px] font-extrabold text-white shadow-lg";
        node.style.cssText = `width:${on ? 44 : 34}px;height:${on ? 44 : 34}px;background:${c.indoor ? "#3A9BD0" : "#F47B35"};outline:${on ? "3px solid #14181D" : "none"};${verified ? "" : "border-style:dashed;opacity:.9"}`;
        node.textContent = n ? String(n) : "";
        node.setAttribute("aria-label", `${c.name}${n ? `, ${n} active runs` : ""}`);
        node.onclick = () => pick.current(c.id);
        const label = document.createElement("span");
        label.textContent = c.name;
        label.style.cssText = "position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:3px;white-space:nowrap;font:700 12px sans-serif;color:#14181D;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;pointer-events:none";
        node.style.position = "relative";
        node.appendChild(label);
        return new maplibre.Marker({ element: node }).setLngLat([c.lng, c.lat]).addTo(map);
      });
    })();
    return () => { cancelled = true; };
  }, [ready, courts, selected, activeCounts]);

  useEffect(() => {
    const c = courts.find((x) => x.id === selected);
    if (ready && c) mapRef.current?.easeTo({ center: [c.lng, c.lat], duration: 500 });
  }, [ready, selected, courts]);

  return <div ref={el} className="h-full w-full" />;
}
