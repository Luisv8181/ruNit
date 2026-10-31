"use client";

// Two renderers behind one interface:
//  - DemoMap: offline, stylized SVG (no tiles, no keys). Streets are decorative, not real.
//  - LiveMap: MapLibre GL with a configurable style URL (NEXT_PUBLIC_MAP_STYLE_URL).

import { useEffect, useMemo, useRef } from "react";
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

export function CourtMap(props: Props) {
  return MAP_STYLE_URL ? <LiveMap {...props} /> : <DemoMap {...props} />;
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
      <rect width={W} height={H} fill="#FBF3E6" />
      {/* parks / greenery */}
      {region === "Hazleton" ? (
        <>
          <path d="M120 420 C 200 360, 330 380, 360 470 C 380 560, 210 600, 140 560 Z" fill="#D4EEE3" />
          <path d="M640 80 C 760 40, 900 90, 880 190 C 860 260, 700 250, 650 190 Z" fill="#D4EEE3" />
        </>
      ) : (
        <>
          <path d="M60 120 C 180 80, 260 140, 240 240 C 220 320, 90 300, 60 230 Z" fill="#D4EEE3" />
          <path d="M700 380 C 820 340, 960 420, 930 520 C 900 600, 760 600, 720 520 Z" fill="#D4EEE3" />
          {/* river */}
          <path d="M-20 520 C 200 470, 320 600, 520 560 C 720 520, 800 300, 1020 260" stroke="#BFE4F6" strokeWidth="26" fill="none" strokeLinecap="round" />
        </>
      )}
      <g stroke="#E9DCC7" strokeWidth="3">{streets.map((d, i) => <path key={i} d={d} />)}</g>
      <path d={region === "Hazleton" ? "M-20 300 C 300 260, 600 340, 1020 250" : "M300 -20 C 380 200, 420 420, 560 660"} stroke="#F2D7A8" strokeWidth="10" fill="none" />

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
        const color = c.indoor ? "#56B8E8" : "#F47B35";
        const verified = c.verification === "community_verified" || c.verification === "officially_verified";
        return (
          <g key={c.id} transform={`translate(${p.x} ${p.y})`} className="cursor-pointer" onClick={() => onSelect(c.id)} role="button" tabIndex={0} aria-label={`${c.name}${active ? `, ${active} active runs` : ""}`} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(c.id)}>
            {active > 0 && <circle r="30" fill={color} opacity=".18" className="holo-pulse" />}
            <circle r={on ? 20 : 15} fill={verified ? color : "#FFF9F0"} stroke={color} strokeWidth={verified ? 0 : 3} strokeDasharray={c.verification === "imported" ? "4 3" : undefined} />
            {/* tiny hoop glyph */}
            <path d="M-6 -1h12M-4 -1l1.5 6h5L4 -1" stroke={verified ? "#fff" : color} strokeWidth="2" fill="none" strokeLinecap="round" />
            {active > 0 && (
              <g transform="translate(13 -13)">
                <circle r="10" fill="#202B30" />
                <text textAnchor="middle" dy="4" fontSize="11" fontWeight="700" fill="#fff" style={{ fontFamily: "JetBrains Mono" }}>{active}</text>
              </g>
            )}
            <text y={on ? 40 : 34} textAnchor="middle" fontSize={on ? 17 : 15} fontWeight={on ? 700 : 600} fill="#202B30" stroke="#FBF3E6" strokeWidth="4" paintOrder="stroke">{c.name}</text>
          </g>
        );
      })}
      <text x={W - 16} y={H - 14} textAnchor="end" fontSize="13" fill="#7A858A">Stylized demo map, streets are decorative, court positions approximate</text>
    </svg>
  );
}

function LiveMap({ courts, region, onSelect, activeCounts }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !el.current) return;
      const b = REGIONS[region];
      const map = new maplibre.Map({
        container: el.current,
        style: MAP_STYLE_URL,
        bounds: [[b.lng[0], b.lat[0]], [b.lng[1], b.lat[1]]],
      });
      mapRef.current = map;
      courts.forEach((c) => {
        const node = document.createElement("button");
        node.className = "grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow";
        node.style.background = c.indoor ? "#56B8E8" : "#F47B35";
        node.textContent = activeCounts[c.id] ? String(activeCounts[c.id]) : "";
        node.setAttribute("aria-label", c.name);
        node.onclick = () => onSelect(c.id);
        new maplibre.Marker({ element: node }).setLngLat([c.lng, c.lat]).addTo(map);
      });
    })();
    return () => {
      cancelled = true;
      (mapRef.current as { remove?: () => void } | null)?.remove?.();
    };
  }, [courts, region, onSelect, activeCounts]);
  return <div ref={el} className="h-full w-full" />;
}
