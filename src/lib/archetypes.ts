import type { Archetype, PlayerDNA, ScoringTag, StatLine } from "./types";

export const ARCH: Record<Archetype, { label: string; color: string; soft: string; effect: string; read: string }> = {
  slasher: { label: "Slasher", color: "#F47B35", soft: "#FCE3D2", effect: "Orange energy trails", read: "Gets downhill and finishes." },
  shooter: { label: "Shooter", color: "#56B8E8", soft: "#DCF0FA", effect: "Blue release arcs", read: "Scores from range and the pull-up." },
  defender: { label: "Defender", color: "#239B72", soft: "#D4EEE3", effect: "Emerald pressure field", read: "Takes things away. Anticipates." },
  playmaker: { label: "Playmaker", color: "#8A6BE0", soft: "#E9E2FA", effect: "Violet passing lanes", read: "Sees the floor. Makes others better." },
  post: { label: "Post", color: "#F4C65E", soft: "#FBEBC4", effect: "Gold footwork rings", read: "Position, strength, touch inside." },
};

export const ARCH_ORDER: Archetype[] = ["slasher", "shooter", "defender", "playmaker", "post"];

const PAIRS: Record<string, string> = {
  "slasher+shooter": "Three-Level Scorer",
  "slasher+defender": "Two-Way Slasher",
  "slasher+playmaker": "Shot Creator",
  "slasher+post": "Slashing Post",
  "shooter+defender": "3-and-D Wing",
  "shooter+playmaker": "Shooting Floor General",
  "shooter+post": "Stretch Big",
  "defender+playmaker": "Two-Way Guard",
  "defender+post": "Rim Protector",
  "playmaker+post": "Point Center",
};

const SINGLE: Record<Archetype, (pos: string) => string> = {
  slasher: (p) => (p === "Guard" ? "Slashing Guard" : p === "Big" ? "Slashing Big" : `Slashing ${p}`),
  shooter: () => "Sharpshooter",
  defender: () => "Lockdown Defender",
  playmaker: () => "Floor General",
  post: () => "Post Specialist",
};

export function rankDNA(dna: PlayerDNA): Archetype[] {
  return [...ARCH_ORDER].sort((a, b) => dna[b] - dna[a]);
}

/** Archetypes a player has actually earned (≥ 60 and within 18 of their top trait). */
export function earnedArchetypes(dna: PlayerDNA): Archetype[] {
  const [top, second] = rankDNA(dna);
  const out: Archetype[] = [top];
  if (dna[second] >= 60 && dna[top] - dna[second] <= 18) out.push(second);
  return out;
}

export function archetypeName(dna: PlayerDNA, position: string): string {
  const e = earnedArchetypes(dna);
  if (e.length === 2) {
    const key = [e[0], e[1]].sort((a, b) => ARCH_ORDER.indexOf(a) - ARCH_ORDER.indexOf(b)).join("+");
    return PAIRS[key] ?? SINGLE[e[0]](position);
  }
  return SINGLE[e[0]](position);
}

export const TAG_TO_ARCH: Record<ScoringTag, Archetype> = {
  Drives: "slasher",
  "Finishing through contact": "slasher",
  "Fast breaks": "slasher",
  Cuts: "slasher",
  "Three-pointers": "shooter",
  "Mid-range": "shooter",
  "Free throws": "shooter",
  "Post moves": "post",
  Putbacks: "post",
};

/**
 * Small, explainable DNA nudge from one game. Returns the new DNA and a plain list of reasons.
 * Deliberately conservative: one game can move a trait by at most 3 points.
 */
export function nudgeDNA(dna: PlayerDNA, tags: ScoringTag[], line: StatLine): { dna: PlayerDNA; reasons: string[] } {
  const next = { ...dna };
  const reasons: string[] = [];
  const bump = (a: Archetype, n: number, why: string) => {
    const before = next[a];
    next[a] = Math.max(0, Math.min(99, next[a] + n));
    if (next[a] !== before) reasons.push(`${ARCH[a].label} ${n > 0 ? "+" : ""}${next[a] - before} · ${why}`);
  };
  const counts: Partial<Record<Archetype, number>> = {};
  tags.forEach((t) => (counts[TAG_TO_ARCH[t]] = (counts[TAG_TO_ARCH[t]] ?? 0) + 1));
  (Object.keys(counts) as Archetype[]).forEach((a) => bump(a, Math.min(3, counts[a]! + 1), "how you said you scored"));
  if (line.ast >= 4) bump("playmaker", 2, `${line.ast} assists`);
  if (line.stl + line.blk >= 3) bump("defender", 2, `${line.stl} steals, ${line.blk} blocks`);
  return { dna: next, reasons };
}
