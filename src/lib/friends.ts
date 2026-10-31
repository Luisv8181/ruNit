// Friends, friend codes, and head-to-head records (confirmed games only).
import { counts, type CourtGame } from "./records";

export interface HeadToHead { vsW: number; vsL: number; withW: number; withL: number; last?: string }

export function headToHead(me: string, other: string, games: CourtGame[]): HeadToHead {
  const r: HeadToHead = { vsW: 0, vsL: 0, withW: 0, withL: 0 };
  [...games].filter(counts).sort((a, b) => +new Date(a.date) - +new Date(b.date)).forEach((g) => {
    const meW = g.winners.includes(me), meL = g.losers.includes(me);
    const oW = g.winners.includes(other), oL = g.losers.includes(other);
    if (meW && oL) { r.vsW++; r.last = g.date; }
    else if (meL && oW) { r.vsL++; r.last = g.date; }
    else if (meW && oW) { r.withW++; r.last = g.date; }
    else if (meL && oL) { r.withL++; r.last = g.date; }
  });
  return r;
}

/** Short, human-typeable friend code. In the live app this maps to an account on the server. */
export function friendCode(playerId: string) {
  let h = 0; for (const c of playerId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = ""; for (let i = 0; i < 6; i++) { s += A[h % A.length]; h = Math.floor(h / A.length) + i * 7; }
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

export const friendLink = (playerId: string, origin: string) => `${origin}/community?add=${encodeURIComponent(friendCode(playerId))}`;
