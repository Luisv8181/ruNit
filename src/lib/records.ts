// Court records, the court passport, and badges.
// Rule: records and stamps count ONLY opponent-confirmed games. Self-reported or teammate-confirmed
// games stay in your game log but never move a court record.

import type { Court, GameFormat, Player, Verification } from "./types";

export interface CourtGame {
  id: string;
  courtId: string;
  date: string;
  format: GameFormat;
  mode: "casual" | "ranked";
  winners: string[];
  losers: string[];
  score: [number, number]; // winner, loser
  topScorer: { id: string; pts: number };
  verification: Verification;
}

export const counts = (g: CourtGame) => g.verification === "opponent" || g.verification === "video";

// ---------- demo ledger (fictional) ----------
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Regulars play best at their home court — this is what makes each court's king different.
const HOME_BONUS: Record<string, Record<string, number>> = {
  "c-northside": { "p-marcus": 160, "p-yari": 60 },
  "c-hilltop": { "p-tasha": 140, "p-luisa": 60 },
  "c-laurel": { "p-kev": 120 },
  "c-elmyard": { "p-deshawn": 170 },
  "c-schoolyard": { "p-luisa": 140, "p-tasha": 80 },
  "c-riverside": { "p-andre": 150, "p-omar": 60 },
  "c-electric": { "p-chris": 160 },
  "c-greenridge": { "p-omar": 140 },
  "c-dunmore": { "p-ben": 160 },
};

function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function seedCourtGames(courts: Court[], players: Player[], me: string): CourtGame[] {
  const r = rng(23);
  const out: CourtGame[] = [];
  const region = (c: Court) => (["Hazleton", "West Hazleton"].includes(c.city) ? "h" : "s");
  const pr = (p: Player) => (["Hazleton", "West Hazleton"].includes(p.city) ? "h" : "s");
  const others = players.filter((p) => p.id !== me);
  courts.forEach((c) => {
    const pool = others.filter((p) => pr(p) === region(c));
    const visitors = others.filter((p) => pr(p) !== region(c));
    const n = c.verification === "imported" ? 4 + Math.floor(r() * 4) : 10 + Math.floor(r() * 10);
    for (let i = 0; i < n; i++) {
      const formats: GameFormat[] = c.hoops === 1 ? ["1v1", "1v1", "2v2"] : ["1v1", "2v2", "3v3", "3v3"];
      const format = formats[Math.floor(r() * formats.length)];
      const k = Number(format[0]);
      const regulars = Object.keys(HOME_BONUS[c.id] ?? {}).map((id) => others.find((p) => p.id === id)!).filter((p) => p && r() < 0.85);
      const bag = [...regulars, ...shuffle(pool, r)];
      while (bag.length < k * 2) bag.push(visitors[Math.floor(r() * visitors.length)]);
      const picked = [...new Set(bag)].slice(0, k * 2);
      if (picked.length < k * 2) continue;
      // split regulars across teams so they face each other, then fill
      const order = shuffle(picked, r);
      const a = order.slice(0, k), b = order.slice(k);
      const str = (t: Player[]) => t.reduce((s, p) => s + p.mmr + (HOME_BONUS[c.id]?.[p.id] ?? 0) * 2.4, 0) / t.length;
      const pa = 1 / (1 + Math.pow(10, (str(b) - str(a)) / 220));
      const aWins = r() < pa;
      const [w, l] = aWins ? [a, b] : [b, a];
      const target = format === "1v1" ? 11 : format === "2v2" ? 15 : 21;
      const lossScore = target - 2 - Math.floor(r() * 9);
      const top = w[Math.floor(r() * w.length)];
      const share = format === "1v1" ? 1 : 0.4 + r() * 0.35;
      const v = r();
      const d = new Date(); d.setDate(d.getDate() - Math.floor(3 + r() * 150)); d.setHours(10 + Math.floor(r() * 10), 0, 0, 0);
      out.push({
        id: `cg-${c.id}-${i}`, courtId: c.id, date: d.toISOString(), format, mode: r() < 0.6 ? "ranked" : "casual",
        winners: w.map((p) => p.id), losers: l.map((p) => p.id), score: [target, Math.max(0, lossScore)],
        topScorer: { id: top.id, pts: Math.round(target * share) },
        verification: v < 0.72 ? "opponent" : v < 0.9 ? "participant" : "self",
      });
    }
  });
  return out;
}

/** The demo user's past games, matching the game log in demo-data.ts. */
export function myCourtGames(me: string, daysAgo: (n: number) => string): CourtGame[] {
  const g = (id: string, courtId: string, d: number, format: GameFormat, won: boolean, mates: string[], opp: string[], score: [number, number], pts: number, v: Verification, mode: "casual" | "ranked"): CourtGame => ({
    id, courtId, date: daysAgo(d), format, mode, verification: v, score,
    winners: won ? [me, ...mates] : opp, losers: won ? opp : [me, ...mates], topScorer: { id: me, pts },
  });
  return [
    g("g-101", "c-northside", 2, "3v3", true, ["p-kev", "p-luisa"], ["p-marcus", "p-yari", "p-tasha"], [21, 17], 9, "opponent", "ranked"),
    g("g-100", "c-elmyard", 5, "1v1", true, [], ["p-deshawn"], [11, 8], 11, "opponent", "ranked"),
    g("g-099", "c-hilltop", 7, "5v5", false, ["p-kev", "p-luisa", "p-yari", "p-marcus"], ["p-tasha", "p-deshawn", "p-omar", "p-sofia", "p-andre"], [15, 13], 6, "participant", "casual"),
    g("g-098", "c-northside", 9, "3v3", true, ["p-yari", "p-kev"], ["p-marcus", "p-luisa", "p-deshawn"], [21, 19], 10, "opponent", "ranked"),
    g("g-097", "c-riverside", 12, "3v3", false, ["p-kev", "p-marcus"], ["p-andre", "p-omar", "p-chris"], [21, 16], 5, "participant", "ranked"),
    g("g-096", "c-northside", 15, "2v2", true, ["p-yari"], ["p-kev", "p-luisa"], [15, 12], 8, "self", "casual"),
  ];
}

// ---------- records ----------
export interface Holder { id: string; value: number; date?: string }
export interface CourtRecords {
  confirmed: number;
  unconfirmed: number;
  mostWins?: Holder;
  winsTable: Holder[];
  longestStreak?: Holder;
  bestGame?: Holder;
  regular?: Holder;
  biggestWin?: Holder & { score: string };
}

export function courtRecords(courtId: string, games: CourtGame[]): CourtRecords {
  const here = games.filter((g) => g.courtId === courtId);
  const ok = here.filter(counts).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const wins = new Map<string, number>(), played = new Map<string, number>(), streak = new Map<string, number>(), best = new Map<string, number>();
  let bestGame: Holder | undefined, biggest: (Holder & { score: string }) | undefined;
  for (const g of ok) {
    g.winners.forEach((id) => { wins.set(id, (wins.get(id) ?? 0) + 1); streak.set(id, (streak.get(id) ?? 0) + 1); best.set(id, Math.max(best.get(id) ?? 0, streak.get(id)!)); });
    g.losers.forEach((id) => streak.set(id, 0));
    [...g.winners, ...g.losers].forEach((id) => played.set(id, (played.get(id) ?? 0) + 1));
    if (!bestGame || g.topScorer.pts > bestGame.value) bestGame = { id: g.topScorer.id, value: g.topScorer.pts, date: g.date };
    const margin = g.score[0] - g.score[1];
    if (g.format === "1v1" && (!biggest || margin > biggest.value)) biggest = { id: g.winners[0], value: margin, date: g.date, score: `${g.score[0]}–${g.score[1]}` };
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id, value]) => ({ id, value }));
  const winsTable = top(wins);
  return {
    confirmed: ok.length,
    unconfirmed: here.length - ok.length,
    mostWins: winsTable[0],
    winsTable,
    longestStreak: top(best)[0],
    bestGame,
    regular: top(played)[0],
    biggestWin: biggest,
  };
}

/** Who holds the most-wins record at each court. */
export function kingsByCourt(courts: Court[], games: CourtGame[]) {
  const m: Record<string, Holder | undefined> = {};
  courts.forEach((c) => (m[c.id] = courtRecords(c.id, games).mostWins));
  return m;
}

// ---------- passport ----------
export type Stamp = { courtId: string; status: "won" | "played" | "none"; firstWin?: string; wins: number; games: number };

export function passport(me: string, courts: Court[], games: CourtGame[]): Stamp[] {
  return courts.map((c) => {
    const mine = games.filter((g) => g.courtId === c.id && (g.winners.includes(me) || g.losers.includes(me)));
    const won = mine.filter((g) => counts(g) && g.winners.includes(me)).sort((a, b) => +new Date(a.date) - +new Date(b.date));
    return { courtId: c.id, status: won.length ? "won" : mine.length ? "played" : "none", firstWin: won[0]?.date, wins: won.length, games: mine.length };
  });
}

// ---------- badges ----------
export interface Badge { id: string; name: string; how: string; earned: boolean; progress?: [number, number] }

export function badges(me: string, courts: Court[], games: CourtGame[]): Badge[] {
  const stamps = passport(me, courts, games);
  const won = stamps.filter((s) => s.status === "won");
  const city = (id: string) => courts.find((c) => c.id === id)!.city;
  const wonCities = new Set(won.map((s) => (["Hazleton", "West Hazleton"].includes(city(s.courtId)) ? "Hazleton" : "Scranton")));
  const kings = kingsByCourt(courts, games);
  const crowns = Object.values(kings).filter((k) => k?.id === me).length;
  const bestHome = Math.max(0, ...stamps.map((s) => s.wins));
  const hazCourts = courts.filter((c) => ["Hazleton", "West Hazleton"].includes(c.city));
  const hazWon = won.filter((s) => hazCourts.some((c) => c.id === s.courtId)).length;
  return [
    { id: "first", name: "First stamp", how: "Win a confirmed game at any court.", earned: won.length > 0 },
    { id: "road", name: "Road win", how: "Win a confirmed game in a city that isn't your home city.", earned: wonCities.size > 1 },
    { id: "three", name: "Three-court run", how: "Win at three different courts.", earned: won.length >= 3, progress: [Math.min(3, won.length), 3] },
    { id: "home", name: "Home court", how: "Win 10 confirmed games at one court.", earned: bestHome >= 10, progress: [Math.min(10, bestHome), 10] },
    { id: "king", name: "King of the court", how: "Hold the most-wins record at any court.", earned: crowns > 0 },
    { id: "city", name: "Every court in Hazleton", how: "Win at every mapped court in the city.", earned: hazWon === hazCourts.length, progress: [hazWon, hazCourts.length] },
    { id: "state", name: "Keystone", how: "Win at every mapped court in Pennsylvania.", earned: won.length === courts.length, progress: [won.length, courts.length] },
  ];
}
