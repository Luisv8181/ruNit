"use client";

// The signature element: a run drawn as the court it's played on.
// Players stand on their spots; open spots are empty rings you can take.
// Outdoor courts get an emerald sport surface, indoor courts get maple. The key is always painted orange.

import { useStore } from "@/lib/store";
import type { Run } from "@/lib/types";
import { TANK } from "./PlayerFigure";

const HOOP = { x: 200, y: 50 };
const SLOTS: [number, number][] = [
  [200, 268], [78, 196], [322, 196], [56, 72], [344, 72],
  [200, 176], [140, 112], [260, 112], [118, 296], [282, 296],
];
// order spots so small runs look like real formations
const ORDER: Record<number, number[]> = {
  2: [0, 5],
  4: [0, 1, 2, 5],
  6: [0, 1, 2, 3, 4, 5],
};

function slotFor(i: number, total: number) {
  const order = ORDER[total] ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return SLOTS[order[i] ?? i] ?? SLOTS[i % SLOTS.length];
}

function guard(p: [number, number]): [number, number] {
  // defender sits between the player and the rim
  const dx = HOOP.x - p[0], dy = HOOP.y - p[1];
  const d = Math.hypot(dx, dy);
  return [p[0] + (dx / d) * 50 + (p[0] < 200 ? 6 : p[0] > 200 ? -6 : 0), p[1] + (dy / d) * 50];
}

interface Props {
  run: Run;
  onJoin?: () => void;
  labels?: boolean;
  className?: string;
}

export function CourtRun({ run, onJoin, labels = true, className = "" }: Props) {
  const { state, court, player } = useStore();
  const c = court(run.courtId);
  const indoor = !!c?.indoor;
  const floor = indoor ? "#E7BE86" : "#2E9C77";
  const apron = indoor ? "#D9AB6E" : "#24876A";
  const line = indoor ? "rgba(32,43,48,.55)" : "#FFF9F0";
  const checking = ["checkin", "full", "open"].includes(run.status) && run.checkedIn.length > 0;
  const onCourt = Math.min(run.capacity, 10);
  const teamsSet = !!run.teams && run.status !== "open";

  type Token = { id?: string; x: number; y: number; team?: "a" | "b" };
  const tokens: Token[] = [];
  if (teamsSet && run.teams) {
    run.teams.a.forEach((id, i) => { const p = slotFor(i, run.teams!.a.length * 2); tokens.push({ id, x: p[0], y: p[1], team: "a" }); });
    run.teams.b.forEach((id, i) => { const p = guard(slotFor(i, run.teams!.a.length * 2)); tokens.push({ id, x: p[0], y: p[1], team: "b" }); });
  } else {
    for (let i = 0; i < onCourt; i++) {
      const p = slotFor(i, onCourt);
      tokens.push({ id: run.participants[i], x: p[0], y: p[1] });
    }
  }
  const bench = run.capacity > 10 ? run.participants.slice(10) : [];
  const meIn = run.participants.includes(state.meId);
  const canJoin = !!onJoin && !meIn && run.participants.length < run.capacity;
  let firstOpen = true;

  return (
    <figure className={className}>
      <svg viewBox="0 0 400 372" className="block w-full" role="img" aria-label={`${run.participants.length} of ${run.capacity} spots filled at ${c?.name ?? "the court"}`}>
        <defs>
          <linearGradient id={`sun-${run.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".22" />
            <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`clip-${run.id}`}><rect x="0" y="0" width="400" height="372" rx="22" /></clipPath>
        </defs>
        <g clipPath={`url(#clip-${run.id})`}>
          <rect width="400" height="372" fill={apron} />
          <rect x="14" y="10" width="372" height="362" fill={floor} />
          {/* painted key */}
          <rect x="152" y="10" width="96" height="146" fill="#F47B35" />
          <g fill="none" stroke={line} strokeWidth="3">
            <rect x="14" y="10" width="372" height="362" />
            <rect x="152" y="10" width="96" height="146" />
            <path d="M152 156 a48 48 0 0 0 96 0" />
            <path d="M152 156 a48 48 0 0 1 96 0" strokeDasharray="8 9" />
            <path d="M40 10 V94 A165 165 0 0 0 360 94 V10" />
            <path d="M152 372 a48 48 0 0 1 96 0" />
          </g>
          {/* backboard and rim */}
          <path d="M176 32 h48" stroke="#202B30" strokeWidth="4" strokeLinecap="round" />
          <circle cx="200" cy="44" r="9" fill="none" stroke="#202B30" strokeWidth="3" />
          <rect width="400" height="372" fill={`url(#sun-${run.id})`} />
        </g>

        {tokens.map((t, i) => {
          const p = t.id ? player(t.id) : undefined;
          if (!p) {
            const clickable = canJoin && firstOpen;
            if (clickable) firstOpen = false;
            return (
              <g key={`open-${i}`} transform={`translate(${t.x} ${t.y})`}
                {...(clickable ? { role: "button", tabIndex: 0, "aria-label": "Take this spot", onClick: onJoin, onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && onJoin!() } : {})}
                className={clickable ? "cursor-pointer" : undefined}>
                <circle className="focus-ring" r="19" fill={clickable ? "rgba(255,249,240,.28)" : "rgba(255,249,240,.08)"} stroke={indoor ? "#202B30" : "#FFF9F0"} strokeOpacity={clickable ? 0.9 : 0.55} strokeWidth="2.5" strokeDasharray="5 5" />
                <path d="M-7 0h14M0-7v14" stroke={indoor ? "#202B30" : "#FFF9F0"} strokeOpacity={clickable ? 0.95 : 0.5} strokeWidth="2.5" strokeLinecap="round" />
                {clickable && labels && (
                  <g transform="translate(0 34)">
                    <rect x="-40" y="-11" width="80" height="22" rx="11" fill="#202B30" />
                    <text textAnchor="middle" y="5" fontSize="13" fontWeight="700" fill="#FFF9F0">Take spot</text>
                  </g>
                )}
              </g>
            );
          }
          const here = run.checkedIn.includes(p.id);
          const dim = checking && !here && !teamsSet;
          const me = p.id === state.meId;
          return (
            <g key={p.id} transform={`translate(${t.x} ${t.y})`} opacity={dim ? 0.5 : 1} className="spot-in" style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: `${i * 40}ms` }}>
              {me && <circle r="27" fill="#F4C65E" opacity=".9" />}
              <g transform="translate(-20 -21)">
                <path d={TANK} fill={p.character.jersey.primary} stroke="#202B30" strokeOpacity=".3" strokeWidth="1.2" strokeLinejoin="round" />
                <text x="20" y="31" textAnchor="middle" fill={p.character.jersey.secondary} fontSize={p.character.jersey.number.length > 1 ? 15.5 : 17} style={{ fontFamily: "'Big Shoulders Display Variable'", fontWeight: 800 }}>{p.character.jersey.number}</text>
              </g>
              {labels && (
                <g transform={`translate(0 ${t.team === "b" ? -34 : 34})`}>
                  <rect x={-(p.nickname.length * 4 + 12)} y="-11" width={p.nickname.length * 8 + 24} height="22" rx="11" fill={me ? "#F4C65E" : "rgba(32,43,48,.82)"} />
                  <text textAnchor="middle" y="5" fontSize="13" fontWeight="700" fill={me ? "#202B30" : "#FFF9F0"}>{me ? "You" : p.nickname}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      {(bench.length > 0 || run.capacity > 10) && (
        <figcaption className="mt-2 text-sm text-ink-2">Got next: {bench.map((id) => player(id)?.nickname).join(", ") || "open"}</figcaption>
      )}
    </figure>
  );
}
