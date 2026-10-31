"use client";

// The Earth as a basketball: an orthographic globe drawn on canvas with d3-geo.
// Pebbled orange skin, black seams, continents pressed into the leather, courts pinned on top.
// Drag to spin, wheel/pinch to zoom, arrow keys and +/- for keyboard users.

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { geoCircle, geoDistance, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import type { OsmCourt } from "@/lib/osm";

export interface GlobePin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "outdoor" | "indoor";
  stamped?: boolean;
  group: string; // cluster label when zoomed out
}

export interface GlobeHandle {
  flyTo: (lng: number, lat: number, zoom: number) => void;
}

export interface GlobeView { lng: number; lat: number; zoom: number; s: number; w: number; n: number; e: number }

interface Props {
  pins: GlobePin[];
  osm?: OsmCourt[];
  density?: [number, number][];
  selected?: string;
  onSelect: (id: string) => void;
  onViewSettled?: (v: GlobeView) => void;
}

export const OSM_MIN_ZOOM = 300;

const MIN_Z = 1, MAX_Z = 8000;
const DEG = 180 / Math.PI;

// Pebble texture: a fixed Fibonacci lattice of points on the sphere.
function pebbles(n: number) {
  const pts: [number, number][] = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = g * i;
    pts.push([Math.atan2(Math.sin(th) * r, Math.cos(th) * r) * DEG, Math.asin(y) * DEG]);
  }
  return pts;
}

// Basketball seams as geography: the equator, the 0°/180° meridian, and two curved seams.
const SEAMS: GeoPermissibleObjects[] = [
  { type: "LineString", coordinates: Array.from({ length: 361 }, (_, i) => [i - 180, 0]) },
  { type: "LineString", coordinates: Array.from({ length: 181 }, (_, i) => [0, i - 90]) },
  { type: "LineString", coordinates: Array.from({ length: 181 }, (_, i) => [180, 90 - i]) },
  geoCircle().center([90, 0]).radius(58)(),
  geoCircle().center([-90, 0]).radius(58)(),
];

export const BallGlobe = forwardRef<GlobeHandle, Props>(function BallGlobe({ pins, osm = [], density, selected, onSelect, onViewSettled }, ref) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef({ lng: 60, lat: -18, zoom: 1 }); // start over the Atlantic-ish, tilted
  const size = useRef({ w: 600, h: 600, dpr: 1 });
  const anim = useRef<number | null>(null);
  const idle = useRef(true);
  const [, setTick] = useState(0);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const reduced = useRef(false);

  const land = useRef(feature(land110 as unknown as Topology, (land110 as unknown as Topology).objects.land));
  const states = useRef<GeoPermissibleObjects | null>(null);
  const loadedDetail = useRef(false);
  const dots = useMemo(() => pebbles(5200), []);

  const loadDetail = useCallback(async () => {
    if (loadedDetail.current) return;
    loadedDetail.current = true;
    const [l50, st] = await Promise.all([import("world-atlas/land-50m.json"), import("us-atlas/states-10m.json")]);
    const t50 = (l50.default ?? l50) as unknown as Topology;
    const ts = (st.default ?? st) as unknown as Topology;
    land.current = feature(t50, t50.objects.land);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    states.current = mesh(ts, ts.objects.states as any, (a, b) => a !== b);
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projection = useCallback(() => {
    const { w, h } = size.current;
    const R = Math.min(w, h) * 0.42;
    return geoOrthographic().scale(R * view.current.zoom).translate([w / 2, h / 2]).rotate([-view.current.lng, -view.current.lat]).clipAngle(90).clipExtent([[-20, -20], [w + 20, h + 20]]).precision(0.3);
  }, []);

  const visiblePins = useCallback(() => {
    const p = projection();
    const center: [number, number] = [view.current.lng, view.current.lat];
    const z = view.current.zoom;
    // Cluster by group when zoomed out so a city reads as one place.
    if (z < 500) {
      const groups = new Map<string, { lng: number; lat: number; n: number; ids: string[]; stamped: number }>();
      pins.forEach((pin) => {
        const g = groups.get(pin.group) ?? { lng: 0, lat: 0, n: 0, ids: [], stamped: 0 };
        g.lng += pin.lng; g.lat += pin.lat; g.n++; g.ids.push(pin.id); g.stamped += pin.stamped ? 1 : 0;
        groups.set(pin.group, g);
      });
      return [...groups.entries()].flatMap(([name, g]) => {
        const ll: [number, number] = [g.lng / g.n, g.lat / g.n];
        if (geoDistance(ll, center) > Math.PI / 2 - 0.02) return [];
        const xy = p(ll)!;
        return [{ cluster: true as const, id: `grp-${name}`, name, n: g.n, stamped: g.stamped, x: xy[0], y: xy[1], ll }];
      });
    }
    return pins.flatMap((pin) => {
      const ll: [number, number] = [pin.lng, pin.lat];
      if (geoDistance(ll, center) > Math.PI / 2 - 0.02) return [];
      const xy = p(ll)!;
      return [{ cluster: false as const, ...pin, x: xy[0], y: xy[1], ll }];
    });
  }, [pins, projection]);

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const { w, h, dpr } = size.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const p = projection();
    const path = geoPath(p, ctx);
    const R = p.scale();
    const cx = w / 2, cy = h / 2;
    const z = view.current.zoom;
    const center: [number, number] = [view.current.lng, view.current.lat];

    // floor shadow (only when the whole ball is in view)
    if (R < Math.min(w, h) * 0.6) {
      ctx.save(); ctx.filter = "blur(14px)"; ctx.fillStyle = "rgba(32,43,48,.22)";
      ctx.beginPath(); ctx.ellipse(cx, cy + R * 1.08, R * 0.78, R * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    // leather
    const g = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.05, cx, cy, R * 1.05);
    g.addColorStop(0, "#FFA569"); g.addColorStop(0.45, "#F47B35"); g.addColorStop(1, "#B7501A");
    ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = g; ctx.fill();

    // continents pressed into the leather
    ctx.beginPath(); path(land.current as GeoPermissibleObjects);
    ctx.fillStyle = "rgba(120,45,10,.30)"; ctx.fill();
    ctx.strokeStyle = "rgba(90,30,5,.35)"; ctx.lineWidth = 1; ctx.stroke();

    // pebbles (thin out as we zoom, so close-ups stay calm)
    if (z < 40) {
      ctx.fillStyle = "rgba(90,30,5,.20)";
      const step = z < 3 ? 1 : z < 12 ? 2 : 4;
      for (let i = 0; i < dots.length; i += step) {
        const d = dots[i];
        if (geoDistance(d, center) > Math.PI / 2) continue;
        const xy = p(d)!;
        ctx.beginPath(); ctx.arc(xy[0], xy[1], 1.15, 0, Math.PI * 2); ctx.fill();
      }
    }

    // state lines once we're close enough to read them
    if (states.current && z > 5) {
      ctx.beginPath(); path(states.current);
      ctx.strokeStyle = "rgba(255,249,240,.55)"; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
    }

    // seams
    ctx.strokeStyle = "#202B30"; ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2.5, Math.min(9, R / 55));
    SEAMS.forEach((s) => { ctx.beginPath(); path(s); ctx.stroke(); });

    // lighting: rim darkening + soft highlight
    const rim = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
    rim.addColorStop(0, "rgba(0,0,0,0)"); rim.addColorStop(1, "rgba(60,20,0,.35)");
    ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = rim; ctx.fill();
    const hi = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.48, 0, cx - R * 0.42, cy - R * 0.48, R * 0.6);
    hi.addColorStop(0, "rgba(255,255,255,.28)"); hi.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = hi; ctx.fill();

    // all mapped courts (snapshot density layer), visible from orbit
    if (density && z < OSM_MIN_ZOOM) {
      ctx.fillStyle = "rgba(255,249,240,.85)";
      const cl = view.current.lat / DEG, cg = view.current.lng / DEG;
      const cx3 = Math.cos(cl) * Math.cos(cg), cy3 = Math.cos(cl) * Math.sin(cg), cz3 = Math.sin(cl);
      const sz = z < 3 ? 1.4 : 2;
      for (const [la, lo] of density) {
        const a = la / DEG, b = lo / DEG;
        if (Math.cos(a) * Math.cos(b) * cx3 + Math.cos(a) * Math.sin(b) * cy3 + Math.sin(a) * cz3 < 0.02) continue;
        const xy = p([lo, la])!;
        ctx.fillRect(xy[0] - sz / 2, xy[1] - sz / 2, sz, sz);
      }
    }

    // live OpenStreetMap courts in view
    if (z >= OSM_MIN_ZOOM) {
      osm.forEach((o) => {
        const ll: [number, number] = [o.lng, o.lat];
        if (geoDistance(ll, center) > Math.PI / 2 - 0.02) return;
        const [x, y] = p(ll)!;
        const on = o.id === selected;
        const r = on ? 9 : z > 1500 ? 6.5 : 4.5;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#FFF9F0"; ctx.fill(); ctx.lineWidth = on ? 3 : 2; ctx.strokeStyle = "#202B30"; ctx.stroke();
        if ((z > 2500 && o.name) || on) {
          ctx.font = "600 13px 'Atkinson Hyperlegible Next Variable', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          const label = o.name ?? "Basketball court";
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = "rgba(255,249,240,.92)"; ctx.beginPath(); ctx.roundRect(x - tw / 2 - 8, y + r + 6, tw + 16, 21, 10.5); ctx.fill();
          ctx.fillStyle = "#202B30"; ctx.fillText(label, x, y + r + 17);
        }
      });
    }

    // pins
    visiblePins().forEach((m) => {
      if (m.cluster) {
        const r = 13 + Math.min(10, m.n * 1.4);
        ctx.beginPath(); ctx.arc(m.x, m.y, r + 5, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,249,240,.35)"; ctx.fill();
        ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.fillStyle = "#202B30"; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = "#FFF9F0"; ctx.stroke();
        ctx.fillStyle = "#FFF9F0"; ctx.font = "800 17px 'Big Shoulders Display Variable', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(m.n), m.x, m.y + 1);
        if (z > 3) {
          ctx.font = "700 14px 'Atkinson Hyperlegible Next Variable', sans-serif";
          const label = `${m.name}`;
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = "rgba(32,43,48,.88)"; ctx.beginPath(); ctx.roundRect(m.x - tw / 2 - 10, m.y + r + 8, tw + 20, 24, 12); ctx.fill();
          ctx.fillStyle = "#FFF9F0"; ctx.fillText(label, m.x, m.y + r + 20.5);
        }
      } else {
        const on = m.id === selected;
        const r = on ? 12 : 9;
        if (m.stamped) { ctx.beginPath(); ctx.arc(m.x, m.y, r + 6, 0, Math.PI * 2); ctx.strokeStyle = "#F4C65E"; ctx.lineWidth = 4; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
        ctx.fillStyle = m.kind === "outdoor" ? "#2E9C77" : "#E7BE86"; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = on ? "#202B30" : "#FFF9F0"; ctx.stroke();
        ctx.font = "700 14px 'Atkinson Hyperlegible Next Variable', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const tw = ctx.measureText(m.name).width;
        ctx.fillStyle = on ? "#202B30" : "rgba(32,43,48,.82)"; ctx.beginPath(); ctx.roundRect(m.x - tw / 2 - 9, m.y + r + 7, tw + 18, 23, 11.5); ctx.fill();
        ctx.fillStyle = "#FFF9F0"; ctx.fillText(m.name, m.x, m.y + r + 19);
      }
    });
  }, [dots, projection, selected, visiblePins, osm, density]);

  // sizing
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = wrap.current!;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: r.width, h: r.height, dpr };
      const c = canvas.current!;
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      c.style.width = `${r.width}px`; c.style.height = `${r.height}px`;
      draw();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  // idle spin: one slow, continuous rotation until someone touches it
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (idle.current && !reduced.current && anim.current === null && view.current.zoom < 1.6) {
        view.current.lng = ((view.current.lng - 0.12 + 540) % 360) - 180;
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  useEffect(() => { draw(); }, [draw, pins, selected, osm, density]);

  // report the view once it stops moving, so callers can load data for it
  useEffect(() => {
    if (!onViewSettled) return;
    let prev = "", emitted = "";
    const id = setInterval(() => {
      const v = view.current;
      const key = `${v.lng.toFixed(3)},${v.lat.toFixed(3)},${v.zoom.toFixed(2)}`;
      if (key === prev && key !== emitted && anim.current === null && pointers.current.size === 0) {
        emitted = key;
        const { w, h } = size.current;
        const R = Math.min(w, h) * 0.42 * v.zoom;
        const half = Math.min(89, (Math.asin(Math.min(1, (h / 2) / R)) * DEG));
        const halfLng = Math.min(180, half * (w / h) / Math.max(0.1, Math.cos(v.lat / DEG)));
        onViewSettled({ lng: v.lng, lat: v.lat, zoom: v.zoom, s: v.lat - half, n: v.lat + half, w: v.lng - halfLng, e: v.lng + halfLng });
      }
      prev = key;
    }, 450);
    return () => clearInterval(id);
  }, [onViewSettled]);

  const setZoom = useCallback((z: number) => {
    view.current.zoom = Math.max(MIN_Z, Math.min(MAX_Z, z));
    if (view.current.zoom > 4) loadDetail();
    draw(); setTick((t) => t + 1);
  }, [draw, loadDetail]);

  const flyTo = useCallback((lng: number, lat: number, zoom: number) => {
    idle.current = false;
    if (anim.current) cancelAnimationFrame(anim.current);
    if (zoom > 4) loadDetail();
    const from = { ...view.current };
    let dl = lng - from.lng; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
    const dur = reduced.current ? 1 : 1700;
    const t0 = performance.now();
    const lz0 = Math.log(from.zoom), lz1 = Math.log(zoom);
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      // rotate first, zoom in on the back half of the move
      const er = Math.min(1, e * 1.4);
      const ez = Math.max(0, (e - 0.25) / 0.75);
      view.current.lng = from.lng + dl * er;
      view.current.lat = from.lat + (lat - from.lat) * er;
      view.current.zoom = Math.exp(lz0 + (lz1 - lz0) * ez);
      draw();
      if (t < 1) anim.current = requestAnimationFrame(step);
      else { anim.current = null; setTick((x) => x + 1); }
    };
    anim.current = requestAnimationFrame(step);
  }, [draw, loadDetail]);

  useImperativeHandle(ref, () => ({ flyTo }), [flyTo]);

  // pointer: drag to rotate, pinch to zoom, click pins
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const pinch = useRef<{ d: number; z: number } | null>(null);

  const hit = (x: number, y: number) => {
    let best: { id: string; d: number; cluster: boolean; ll: [number, number] } | null = null;
    visiblePins().forEach((m) => {
      const d = Math.hypot(m.x - x, m.y - y);
      const r = m.cluster ? 26 : 18;
      if (d < r && (!best || d < best.d)) best = { id: m.id, d, cluster: m.cluster, ll: m.ll };
    });
    if (view.current.zoom >= OSM_MIN_ZOOM) {
      const p = projection();
      const center: [number, number] = [view.current.lng, view.current.lat];
      osm.forEach((o) => {
        const ll: [number, number] = [o.lng, o.lat];
        if (geoDistance(ll, center) > Math.PI / 2 - 0.02) return;
        const [ox, oy] = p(ll)!;
        const d = Math.hypot(ox - x, oy - y);
        if (d < 12 && (!best || d < best.d - 4)) best = { id: o.id, d, cluster: false, ll };
      });
    }
    return best as { id: string; d: number; cluster: boolean; ll: [number, number] } | null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false; idle.current = false;
    if (anim.current) { cancelAnimationFrame(anim.current); anim.current = null; }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.current.zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const rect = canvas.current!.getBoundingClientRect();
    const prev = pointers.current.get(e.pointerId);
    if (!prev) {
      const h = hit(e.clientX - rect.left, e.clientY - rect.top);
      setHover(h ? { id: h.id, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
      return;
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      setZoom(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d));
      return;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragged.current = true;
    const s = projection().scale();
    view.current.lng -= (dx / s) * DEG;
    view.current.lat = Math.max(-85, Math.min(85, view.current.lat + (dy / s) * DEG));
    draw();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!dragged.current) {
      const rect = canvas.current!.getBoundingClientRect();
      const h = hit(e.clientX - rect.left, e.clientY - rect.top);
      if (h?.cluster) flyTo(h.ll[0], h.ll[1], 1700);
      else if (h) onSelect(h.id);
    }
  };
  const onWheel = (e: React.WheelEvent) => { idle.current = false; setZoom(view.current.zoom * Math.exp(-e.deltaY * 0.0018)); };
  const onKey = (e: React.KeyboardEvent) => {
    const s = 8 / Math.sqrt(view.current.zoom);
    const k = e.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-"].includes(k)) { e.preventDefault(); idle.current = false; }
    if (k === "ArrowLeft") view.current.lng -= s;
    if (k === "ArrowRight") view.current.lng += s;
    if (k === "ArrowUp") view.current.lat = Math.min(85, view.current.lat + s);
    if (k === "ArrowDown") view.current.lat = Math.max(-85, view.current.lat - s);
    if (k === "+" || k === "=") return setZoom(view.current.zoom * 1.5);
    if (k === "-") return setZoom(view.current.zoom / 1.5);
    draw();
  };

  // wheel must be non-passive to stop the page scrolling while zooming the ball
  useEffect(() => {
    const c = canvas.current!;
    const stop = (e: WheelEvent) => e.preventDefault();
    c.addEventListener("wheel", stop, { passive: false });
    return () => c.removeEventListener("wheel", stop);
  }, []);

  const hovered = hover ? pins.find((p) => p.id === hover.id) ?? (() => { const o = osm.find((x) => x.id === hover.id); return o ? { name: o.name ?? "Basketball court (OpenStreetMap)" } : undefined; })() : undefined;

  return (
    <div ref={wrap} className="relative h-full w-full select-none">
      <canvas
        ref={canvas}
        tabIndex={0}
        role="application"
        aria-label="Basketball globe. Drag to spin, scroll or pinch to zoom, arrow keys to rotate, plus and minus to zoom."
        className="h-full w-full cursor-grab touch-none rounded-[28px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/25 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onWheel={onWheel}
        onKeyDown={onKey}
      />
      {hovered && hover && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-paper" style={{ left: hover.x, top: hover.y - 14 }}>
          {hovered.name}
        </div>
      )}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="absolute bottom-3 left-4 rounded-full bg-paper/90 px-2.5 py-1 text-[12px] text-ink-2 hover:text-ink">Court data © OpenStreetMap contributors</a>
      <div className="absolute bottom-4 right-4 flex flex-col overflow-hidden rounded-xl border-2 border-ink bg-paper">
        <button aria-label="Zoom in" className="grid h-10 w-10 place-items-center text-xl font-bold hover:bg-ink hover:text-paper" onClick={() => { idle.current = false; setZoom(view.current.zoom * 1.8); }}>+</button>
        <button aria-label="Zoom out" className="grid h-10 w-10 place-items-center border-t-2 border-ink text-xl font-bold hover:bg-ink hover:text-paper" onClick={() => setZoom(view.current.zoom / 1.8)}>−</button>
      </div>
    </div>
  );
});
