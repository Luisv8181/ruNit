// Layered, editable player character. Every part is a reusable SVG layer driven by config —
// changing a jersey colour re-renders one fill, it never regenerates an image.

import type { Archetype, CharacterConfig } from "@/lib/types";
import { ARCH } from "@/lib/archetypes";

export const SKIN = ["#F6D3B3", "#E8B48C", "#C98E62", "#9A6440", "#6B4128"];
const BUILD = { lean: 0.9, athletic: 1, strong: 1.13 };

function Effect({ kind, id }: { kind: Archetype; id: string }) {
  const c = ARCH[kind].color;
  switch (kind) {
    case "slasher":
      return (
        <g>
          <defs>
            <linearGradient id={`sl-${id}`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor={c} stopOpacity="0" />
              <stop offset=".7" stopColor={c} stopOpacity=".85" />
              <stop offset="1" stopColor="#F4C65E" stopOpacity="1" />
            </linearGradient>
          </defs>
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${18 + i * 10} ${262 - i * 6} C ${70 + i * 8} ${210 - i * 8}, ${110} ${160 - i * 10}, ${150 + i * 6} ${150 - i * 4}`} stroke={`url(#sl-${id})`} strokeWidth={6 - i * 1.5} strokeLinecap="round" fill="none" className="holo-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
          <circle cx="146" cy="160" r="26" fill="none" stroke={c} strokeOpacity=".5" strokeWidth="1.5" strokeDasharray="3 5" className="holo-drift" />
        </g>
      );
    case "shooter":
      return (
        <g>
          <path d="M146 150 C 160 60, 120 10, 64 22" stroke={c} strokeWidth="2.5" fill="none" strokeDasharray="2 7" strokeLinecap="round" className="holo-drift" />
          {[0.2, 0.45, 0.7].map((t, i) => (
            <circle key={i} cx={146 - t * 90} cy={150 - Math.sin(t * Math.PI) * 120 - t * 10} r={3 - i * 0.6} fill={c} className="holo-pulse" />
          ))}
          <path d="M40 22 h28 M54 16 v12" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "defender":
      return (
        <g className="holo-pulse">
          {[64, 84, 104].map((rx, i) => (
            <ellipse key={i} cx="100" cy="268" rx={rx} ry={rx * 0.22} fill="none" stroke={c} strokeOpacity={0.7 - i * 0.2} strokeWidth="2" />
          ))}
          <path d="M28 150 Q100 110 172 150" stroke={c} strokeOpacity=".45" strokeWidth="10" fill="none" strokeLinecap="round" />
        </g>
      );
    case "playmaker":
      return (
        <g>
          {[
            "M58 168 C 30 120, 20 90, 12 60",
            "M58 168 C 20 170, 8 190, 4 214",
            "M146 160 C 186 140, 192 110, 196 80",
          ].map((d, i) => (
            <path key={i} d={d} stroke={c} strokeWidth="2.2" fill="none" strokeDasharray="6 6" className="holo-drift" />
          ))}
          {[[12, 60], [4, 214], [196, 80]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5" fill="#FFF9F0" stroke={c} strokeWidth="2.2" className="holo-pulse" />
          ))}
        </g>
      );
    case "post":
      return (
        <g className="holo-pulse">
          <circle cx="86" cy="270" r="18" fill="none" stroke={c} strokeWidth="2.5" />
          <circle cx="116" cy="270" r="18" fill="none" stroke={c} strokeWidth="2.5" strokeDasharray="4 4" />
          <path d="M60 252 a40 14 0 0 1 80 0" stroke={c} strokeWidth="1.5" fill="none" />
          <path d="M134 262 l8 -4 -1 8" stroke={c} strokeWidth="2" fill="none" />
        </g>
      );
  }
}

function Hair({ style, color }: { style: CharacterConfig["hair"]; color: string }) {
  switch (style) {
    case "fade":
      return <path d="M83 50 C 83 32, 117 32, 117 50 C 114 42, 86 42, 83 50 Z" fill={color} />;
    case "buzz":
      return <path d="M84 48 C 85 35, 115 35, 116 48 C 112 42, 88 42, 84 48 Z" fill={color} opacity=".85" />;
    case "twists":
      return (
        <g fill={color}>
          <path d="M83 50 C 83 33, 117 33, 117 50 C 114 43, 86 43, 83 50 Z" />
          {[86, 93, 100, 107, 114].map((x, i) => <circle key={i} cx={x} cy={i % 2 ? 33 : 35} r="5" />)}
        </g>
      );
    case "bun":
      return (
        <g fill={color}>
          <path d="M83 52 C 82 32, 118 32, 117 52 C 112 41, 88 41, 83 52 Z" />
          <circle cx="100" cy="28" r="8" />
        </g>
      );
    case "locs":
      return (
        <g fill={color}>
          <path d="M82 52 C 82 31, 118 31, 118 52 C 112 41, 88 41, 82 52 Z" />
          {[82, 86, 114, 118].map((x, i) => <rect key={i} x={x - 2.5} y="44" width="5" height={22 + (i % 2) * 6} rx="2.5" />)}
        </g>
      );
  }
}

export function PlayerFigure({ config, size = 220, effects = true, idSuffix = "x", className = "" }: { config: CharacterConfig; size?: number; effects?: boolean; idSuffix?: string; className?: string }) {
  const w = BUILD[config.build];
  const skin = SKIN[config.skin] ?? SKIN[2];
  const { primary, secondary, number, cut } = config.jersey;
  const sh = 28 * w, wa = 20 * w;
  const sleeveColor = config.sleeve === "none" ? null : "#202B30";
  const flux = config.sleeve === "flux";
  const glow = config.effects[0] ? ARCH[config.effects[0]].color : "#F47B35";
  const shoeH = config.shoes.height === "mid" ? 15 : 10;
  const leftArm = `M${100 - sh + 4} 84 Q ${100 - sh - 10} 120, ${100 - sh - 8} 166`;
  const rightArm = `M${100 + sh - 4} 84 Q ${100 + sh + 16} 118, ${100 + sh + 6} 150`;
  const armW = 12.5 * w;
  return (
    <svg viewBox="0 0 200 300" width={size} height={size * 1.5} className={className} role="img" aria-label={`Player character wearing number ${number}`}>
      <ellipse cx="100" cy="276" rx="56" ry="8" fill="#202B30" opacity=".12" />
      {effects && config.effects.map((e) => <Effect key={e} kind={e} id={`${e}-${idSuffix}`} />)}

      {/* legs */}
      <path d={`M91 196 L 88 262 M109 196 L 112 262`} stroke={skin} strokeWidth={14 * w} strokeLinecap="round" />
      {config.tights && <path d={`M91 196 L 89.5 236 M109 196 L 110.5 236`} stroke="#202B30" strokeWidth={14.5 * w} strokeLinecap="round" />}
      {/* shoes */}
      {[[78, 262], [102, 262]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y - shoeH + 10} width="22" height={shoeH} rx="5" fill={config.shoes.color} stroke="#202B30" strokeOpacity=".25" />
          <rect x={x} y={y + 6} width="22" height="4" rx="2" fill="#202B30" opacity=".8" />
        </g>
      ))}
      {/* shorts */}
      <path d={`M${100 - wa - 2} 156 L ${100 + wa + 2} 156 L ${100 + wa + 8} 204 L 104 204 L 100 188 L 96 204 L ${100 - wa - 8} 204 Z`} fill={primary} />
      <path d={`M${100 - wa - 5} 170 L ${100 - wa - 8} 204 M${100 + wa + 5} 170 L ${100 + wa + 8} 204`} stroke={secondary} strokeWidth="3" />

      {/* arms (behind torso for tank cut) */}
      <path d={leftArm} stroke={skin} strokeWidth={armW} strokeLinecap="round" fill="none" />
      <path d={rightArm} stroke={skin} strokeWidth={armW} strokeLinecap="round" fill="none" />
      {sleeveColor && (
        <>
          <path d={leftArm} stroke={sleeveColor} strokeWidth={armW + 0.5} strokeLinecap="round" fill="none" />
          {flux && (
            <>
              <path d={leftArm} stroke={glow} strokeWidth={armW + 3} strokeLinecap="round" fill="none" opacity=".18" className="holo-pulse" />
              <path d={leftArm} stroke={glow} strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <circle cx={100 - sh - 8} cy="160" r="2.6" fill={glow} className="holo-pulse" />
            </>
          )}
        </>
      )}

      {/* torso */}
      <path d={`M${100 - sh} 80 Q 100 72, ${100 + sh} 80 L ${100 + wa + 1} 160 L ${100 - wa - 1} 160 Z`} fill={primary} />
      {cut === "tank" ? (
        <path d={`M${100 - sh + 7} 80 Q 100 102, ${100 + sh - 7} 80`} fill={skin} />
      ) : (
        <>
          <path d={`M${100 - sh} 80 L ${100 - sh - 12} 106 L ${100 - sh - 1} 112 L ${100 - sh + 6} 96 Z`} fill={primary} />
          <path d={`M${100 + sh} 80 L ${100 + sh + 13} 104 L ${100 + sh + 2} 110 L ${100 + sh - 6} 96 Z`} fill={primary} />
          <path d="M92 79 Q 100 88, 108 79" fill={skin} />
        </>
      )}
      <path d={`M${100 - sh + 7} 80 Q 100 ${cut === "tank" ? 102 : 88}, ${100 + sh - 7} 80`} fill="none" stroke={secondary} strokeWidth="2.5" />
      <text x="100" y="138" textAnchor="middle" fill={secondary} style={{ fontFamily: "'Archivo Variable'", fontStretch: "75%", fontWeight: 900 }} fontSize="34">{number}</text>

      {/* neck + head */}
      <rect x="94" y="62" width="12" height="16" rx="5" fill={skin} />
      <circle cx="100" cy="51" r="17" fill={skin} />
      <Hair style={config.hair} color="#1d1714" />
      {config.headband && <rect x="83" y="44" width="34" height="6" rx="3" fill={secondary} stroke="#202B30" strokeOpacity=".2" />}

      {/* ball */}
      <g transform={`translate(${100 + sh + 12} 160)`}>
        <circle r="16" fill="#F47B35" />
        <path d="M-16 0h32M0-16v32M-11-11c5 5 5 17 0 22M11-11c-5 5-5 17 0 22" stroke="#202B30" strokeWidth="1.4" fill="none" opacity=".75" />
      </g>
    </svg>
  );
}

export function Avatar({ config, size = 40, ring = true }: { config: CharacterConfig; size?: number; ring?: boolean }) {
  const skin = SKIN[config.skin] ?? SKIN[2];
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="shrink-0">
      <circle cx="20" cy="20" r="20" fill={config.jersey.primary} />
      {ring && <circle cx="20" cy="20" r="18.5" fill="none" stroke={config.jersey.secondary} strokeOpacity=".7" />}
      <path d="M8 40 C 9 30, 31 30, 32 40" fill={config.jersey.secondary} opacity=".9" />
      <circle cx="20" cy="17" r="8" fill={skin} />
      <g transform="translate(-27 -6.97) scale(.47)"><Hair style={config.hair} color="#1d1714" /></g>
    </svg>
  );
}
