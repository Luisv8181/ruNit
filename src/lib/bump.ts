// Phone-to-phone confirmation payload. Travels by NFC (Android Chrome, Web NFC), QR code, or — in the
// native apps — Apple's Nearby Interaction / Android NFC. Contains only what the other phone needs.
import type { StatLine } from "./types";

export interface BumpPayload { v: 1; run: string; code: string; player: string; line: StatLine; score: [number, number] }

const KEYS: (keyof StatLine)[] = ["pts", "ast", "reb", "stl", "blk", "tov"];

export function encodeBump(p: BumpPayload): string {
  return `RUNIT1|${p.run}|${p.code}|${p.player}|${KEYS.map((k) => p.line[k]).join(".")}|${p.score.join("-")}`;
}

export function decodeBump(s: string): BumpPayload | null {
  const parts = s.trim().split("|");
  if (parts.length !== 6 || parts[0] !== "RUNIT1") return null;
  const nums = parts[4].split(".").map(Number);
  const sc = parts[5].split("-").map(Number);
  if (nums.length !== 6 || nums.some((n) => !Number.isFinite(n) || n < 0) || sc.length !== 2) return null;
  const line = Object.fromEntries(KEYS.map((k, i) => [k, nums[i]])) as unknown as StatLine;
  return { v: 1, run: parts[1], code: parts[2], player: parts[3], line, score: [sc[0], sc[1]] };
}

