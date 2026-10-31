import type { Court, Player, Run, StatLine, StatSubmission } from "./types";

// The demo user's approximate location (Hazleton, North End). Exact user location is never stored.
export const DEMO_HOME = { lat: 40.9625, lng: -75.976 };

export function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function distLabel(c: Court) {
  const m = miles(DEMO_HOME, c);
  return m < 0.2 ? "nearby" : m < 10 ? `${m.toFixed(1)} mi` : `${Math.round(m)} mi`;
}

export function when(iso: string) {
  const d = new Date(iso);
  const diff = (d.getTime() - Date.now()) / 60000;
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diff > -90 && diff < 0) return `Started ${time}`;
  if (diff >= 0 && diff < 60) return `In ${Math.max(1, Math.round(diff))} min · ${time}`;
  const today = new Date();
  const tmr = new Date(); tmr.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return `Today · ${time}`;
  if (d.toDateString() === tmr.toDateString()) return `Tomorrow · ${time}`;
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · ${time}`;
}

export function dateShort(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function heightLabel(inches: number) {
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}

export const EMPTY_LINE: StatLine = { pts: 0, ast: 0, reb: 0, stl: 0, blk: 0, tov: 0 };

/** Snake-draft teams by rating so ranked games start balanced. */
export function balanceTeams(ids: string[], players: Player[]) {
  const sorted = [...ids].sort((x, y) => (players.find((p) => p.id === y)?.mmr ?? 0) - (players.find((p) => p.id === x)?.mmr ?? 0));
  const a: string[] = [], b: string[] = [];
  sorted.forEach((id, i) => ((i % 4 === 0 || i % 4 === 3) ? a : b).push(id));
  return { a, b };
}

/**
 * DEMO SIMULATION: produce the other participants' self-submitted lines.
 * One teammate over-reports by 2 points so the consistency check has something real to catch.
 */
export function simulateOthers(run: Run, meId: string, myPts: number): StatSubmission[] {
  if (!run.teams || !run.score) return [];
  const out: StatSubmission[] = [];
  const at = new Date().toISOString();
  const seedFrom = (s: string) => [...s].reduce((t, c) => t + c.charCodeAt(0), 0);
  const split = (total: number, ids: string[]) => {
    const parts = ids.map((id) => 1 + (seedFrom(id + run.id) % 5));
    const sum = parts.reduce((t, p) => t + p, 0);
    const pts = parts.map((p) => Math.floor((p / sum) * total));
    pts[0] += total - pts.reduce((t, p) => t + p, 0);
    return pts;
  };
  const onA = run.teams.a.includes(meId);
  const myTeam = (onA ? run.teams.a : run.teams.b).filter((id) => id !== meId);
  const oppTeam = onA ? run.teams.b : run.teams.a;
  const myScore = onA ? run.score.a : run.score.b;
  const oppScore = onA ? run.score.b : run.score.a;
  const mine = split(Math.max(0, myScore - myPts), myTeam);
  if (mine.length) mine[0] += 2; // the over-report
  const theirs = split(oppScore, oppTeam);
  const mk = (id: string, pts: number, i: number): StatSubmission => ({
    playerId: id,
    line: { pts, ast: (seedFrom(id) + i) % 4, reb: 2 + (seedFrom(id) % 6), stl: seedFrom(id) % 3, blk: (seedFrom(id) >> 2) % 2, tov: 1 + (seedFrom(id) % 3) },
    submittedAt: at, confirmedBy: [], disputedBy: [],
  });
  myTeam.forEach((id, i) => out.push(mk(id, mine[i], i)));
  oppTeam.forEach((id, i) => out.push(mk(id, theirs[i], i)));
  return out;
}

export function teamPoints(run: Run, team: "a" | "b") {
  if (!run.teams) return 0;
  return run.submissions.filter((s) => run.teams![team].includes(s.playerId)).reduce((t, s) => t + s.line.pts, 0);
}
