"use client";

// Demo-mode data store. All state lives in the browser (localStorage) and is seeded from
// demo-data.ts. A Supabase-backed adapter implements the same actions against the schema
// in supabase/migrations once credentials are configured (see src/lib/backend.ts).

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import * as seed from "./demo-data";
import { nudgeDNA } from "./archetypes";
import type { CourtGame } from "./records";
import type {
  ActivityItem, CharacterConfig, Court, CourtSubmission, GameFormat, GameRecord, Notice,
  Player, Reflection, Run, StatLine, StatSubmission, Verification,
} from "./types";

export interface QueueEntry { id: string; playerId: string; size: number; at: string }
export interface Tally { a: number; b: number; mine: number; log: { k: "a" | "b" | "mine"; v: number; at: string }[] }

export interface State {
  version: 5;
  friends: string[];
  queues: Record<string, QueueEntry[]>;
  tallies: Record<string, Tally>;
  bumped: Record<string, string[]>;
  meId: string;
  courts: Court[];
  players: Player[];
  runs: Run[];
  history: GameRecord[];
  courtGames: CourtGame[];
  reflections: Reflection[];
  squads: typeof seed.squads;
  challenges: typeof seed.challenges;
  opportunities: typeof seed.opportunities;
  activity: ActivityItem[];
  notices: Notice[];
  courtSubmissions: CourtSubmission[];
  interests: Record<string, { at: string; shareCard: boolean }>;
  blocked: string[];
  reports: { playerId: string; reason: string; at: string }[];
  dnaLog: { at: string; runId: string; reasons: string[] }[];
}

function fresh(): State {
  return {
    version: 5,
    friends: ["p-marcus", "p-yari", "p-deshawn"],
    queues: seed.queues,
    tallies: {},
    bumped: {},
    meId: seed.ME,
    courts: seed.courts,
    players: seed.players,
    runs: seed.runs,
    history: seed.history,
    courtGames: seed.courtGames,
    reflections: seed.reflections,
    squads: seed.squads,
    challenges: seed.challenges,
    opportunities: seed.opportunities,
    activity: seed.activity,
    notices: [
      { id: "n-welcome", at: new Date().toISOString(), title: "Your 3s at Northside tip soon", body: "Big Bell and Yari are checked in. Check in with code NSC-7714 when you get to the court.", href: "/runs/r-northside-now", read: false },
    ],
    courtSubmissions: [],
    interests: {},
    blocked: [],
    reports: [],
    dnaLog: [],
  };
}

export type NewRunInput = {
  courtId: string; startsAt: string; format: GameFormat; target: 11 | 15 | 21; capacity: number;
  mode: "casual" | "ranked"; visibility: "public" | "private"; title: string; requirement?: string; recurring?: string;
};

type Action =
  | { type: "hydrate"; state: State }
  | { type: "reset" }
  | { type: "createRun"; run: Run }
  | { type: "join"; runId: string }
  | { type: "leave"; runId: string }
  | { type: "simJoin"; runId: string; playerId: string }
  | { type: "checkIn"; runId: string; playerId: string }
  | { type: "setTeams"; runId: string; teams: { a: string[]; b: string[] } }
  | { type: "tipOff"; runId: string }
  | { type: "finalScore"; runId: string; a: number; b: number }
  | { type: "submitStats"; runId: string; mine: StatLine; others: StatSubmission[] }
  | { type: "reviseSub"; runId: string; playerId: string; line: StatLine }
  | { type: "confirmSub"; runId: string; playerId: string; by: string }
  | { type: "disputeSub"; runId: string; playerId: string; by: string }
  | { type: "finishReview"; runId: string }
  | { type: "reflect"; reflection: Reflection }
  | { type: "character"; config: CharacterConfig; nickname: string }
  | { type: "joinSquad"; squadId: string }
  | { type: "leaveSquad"; squadId: string }
  | { type: "acceptChallenge"; id: string }
  | { type: "courtSubmission"; sub: CourtSubmission }
  | { type: "interest"; oppId: string; shareCard: boolean }
  | { type: "withdrawInterest"; oppId: string }
  | { type: "readNotice"; id: string }
  | { type: "block"; playerId: string }
  | { type: "report"; playerId: string; reason: string }
  | { type: "addFriend"; playerId: string }
  | { type: "removeFriend"; playerId: string }
  | { type: "queueJoin"; courtId: string; size: number }
  | { type: "queueLeave"; courtId: string }
  | { type: "queueAdvance"; courtId: string }
  | { type: "tally"; runId: string; k: "a" | "b" | "mine"; v: number }
  | { type: "undoTally"; runId: string }
  | { type: "bump"; runId: string; playerId: string };

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

function patchRun(s: State, id: string, f: (r: Run) => Run): State {
  return { ...s, runs: s.runs.map((r) => (r.id === id ? f(r) : r)) };
}

function verificationOf(sub: StatSubmission, run: Run): Verification {
  if (!run.teams) return "self";
  const mine = run.teams.a.includes(sub.playerId) ? run.teams.a : run.teams.b;
  const opp = mine === run.teams.a ? run.teams.b : run.teams.a;
  if (sub.confirmedBy.some((id) => opp.includes(id))) return "opponent";
  if (sub.confirmedBy.some((id) => mine.includes(id))) return "participant";
  return "self";
}
export { verificationOf };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "hydrate":
      return a.state;
    case "reset":
      return fresh();
    case "createRun":
      return {
        ...s,
        runs: [a.run, ...s.runs],
        activity: [{ id: uid("a"), at: now(), text: `You called a run: ${a.run.title}`, kind: "run" }, ...s.activity],
      };
    case "join":
      return patchRun(s, a.runId, (r) =>
        r.participants.includes(s.meId) || r.participants.length >= r.capacity
          ? r
          : { ...r, participants: [...r.participants, s.meId], status: r.participants.length + 1 >= r.capacity ? "full" : r.status }
      );
    case "leave":
      return patchRun(s, a.runId, (r) => ({ ...r, participants: r.participants.filter((p) => p !== s.meId), checkedIn: r.checkedIn.filter((p) => p !== s.meId), status: r.status === "full" ? "open" : r.status }));
    case "simJoin":
      return patchRun(s, a.runId, (r) =>
        r.participants.includes(a.playerId) || r.participants.length >= r.capacity
          ? r
          : { ...r, participants: [...r.participants, a.playerId], status: r.participants.length + 1 >= r.capacity ? "full" : r.status }
      );
    case "checkIn":
      return patchRun(s, a.runId, (r) => ({
        ...r,
        checkedIn: r.checkedIn.includes(a.playerId) ? r.checkedIn : [...r.checkedIn, a.playerId],
        status: r.status === "open" || r.status === "full" ? "checkin" : r.status,
      }));
    case "setTeams":
      return patchRun(s, a.runId, (r) => ({ ...r, teams: a.teams }));
    case "tipOff":
      return patchRun(s, a.runId, (r) => ({ ...r, status: "live" }));
    case "finalScore":
      return patchRun(s, a.runId, (r) => ({ ...r, status: "final", score: { a: a.a, b: a.b } }));
    case "submitStats":
      return patchRun(s, a.runId, (r) => ({
        ...r,
        submissions: [{ playerId: s.meId, line: a.mine, submittedAt: now(), confirmedBy: [], disputedBy: [] }, ...a.others],
      }));
    case "reviseSub":
      return patchRun(s, a.runId, (r) => ({
        ...r,
        submissions: r.submissions.map((x) => (x.playerId === a.playerId ? { ...x, line: a.line, revised: true, confirmedBy: [], disputedBy: [] } : x)),
      }));
    case "confirmSub":
      return patchRun(s, a.runId, (r) => ({
        ...r,
        submissions: r.submissions.map((x) =>
          x.playerId === a.playerId && !x.confirmedBy.includes(a.by)
            ? { ...x, confirmedBy: [...x.confirmedBy, a.by], disputedBy: x.disputedBy.filter((d) => d !== a.by) }
            : x
        ),
      }));
    case "disputeSub":
      return patchRun(s, a.runId, (r) => ({
        ...r,
        submissions: r.submissions.map((x) =>
          x.playerId === a.playerId && !x.disputedBy.includes(a.by)
            ? { ...x, disputedBy: [...x.disputedBy, a.by], confirmedBy: x.confirmedBy.filter((d) => d !== a.by) }
            : x
        ),
      }));
    case "finishReview": {
      const run = s.runs.find((r) => r.id === a.runId);
      if (!run || !run.teams || !run.score) return s;
      const mine = run.submissions.find((x) => x.playerId === s.meId);
      if (!mine) return s;
      const onA = run.teams.a.includes(s.meId);
      const won = onA ? run.score.a > run.score.b : run.score.b > run.score.a;
      const myTeam = onA ? run.teams.a : run.teams.b;
      const oppTeam = onA ? run.teams.b : run.teams.a;
      const avg = (ids: string[]) => ids.reduce((t, id) => t + (s.players.find((p) => p.id === id)?.mmr ?? 1400), 0) / ids.length;
      const expected = 1 / (1 + Math.pow(10, (avg(oppTeam) - avg(myTeam)) / 400));
      const delta = run.mode === "ranked" ? Math.round(24 * ((won ? 1 : 0) - expected)) : undefined;
      const rec: GameRecord = {
        runId: run.id, date: now(), courtId: run.courtId, format: run.format, mode: run.mode,
        result: won ? "W" : "L", score: `${onA ? run.score.a : run.score.b}–${onA ? run.score.b : run.score.a}`,
        line: mine.line, verification: verificationOf(mine, run), mmrDelta: delta,
      };
      return {
        ...s,
        runs: s.runs.map((r) => (r.id === run.id ? { ...r, status: "reviewed" } : r)),
        history: [rec, ...s.history.filter((h) => h.runId !== run.id)],
        courtGames: [
          ...s.courtGames.filter((g) => g.id !== run.id),
          {
            id: run.id, courtId: run.courtId, date: rec.date, format: run.format, mode: run.mode,
            winners: run.score.a > run.score.b ? run.teams.a : run.teams.b,
            losers: run.score.a > run.score.b ? run.teams.b : run.teams.a,
            score: [Math.max(run.score.a, run.score.b), Math.min(run.score.a, run.score.b)],
            topScorer: [...run.submissions].sort((x, y) => y.line.pts - x.line.pts).map((x) => ({ id: x.playerId, pts: x.line.pts }))[0] ?? { id: s.meId, pts: mine.line.pts },
            verification: rec.verification,
          },
        ],
        players: s.players.map((p) =>
          p.id === s.meId
            ? { ...p, mmr: p.mmr + (delta ?? 0), trust: { ...p.trust, confirmedGames: p.trust.confirmedGames + (rec.verification === "self" ? 0 : 1), attendance: Math.min(100, p.trust.attendance + 1) } }
            : p
        ),
        notices: [
          { id: uid("n"), at: now(), title: "How did you get your points today?", body: `${won ? "Nice win" : "Tough one"} at ${s.courts.find((c) => c.id === run.courtId)?.name}. Thirty seconds, all optional.`, href: `/runs/${run.id}/reflect`, read: false },
          ...s.notices,
        ],
        activity: [{ id: uid("a"), at: now(), text: `${run.title} final: ${run.score.a}–${run.score.b}`, kind: "run" }, ...s.activity],
      };
    }
    case "reflect": {
      const game = s.history.find((h) => h.runId === a.reflection.runId);
      const me = s.players.find((p) => p.id === s.meId)!;
      const { dna, reasons } = game ? nudgeDNA(me.dna, a.reflection.scoring, game.line) : { dna: me.dna, reasons: [] as string[] };
      return {
        ...s,
        reflections: [a.reflection, ...s.reflections.filter((r) => r.runId !== a.reflection.runId)],
        players: s.players.map((p) => (p.id === s.meId ? { ...p, dna } : p)),
        dnaLog: reasons.length ? [{ at: now(), runId: a.reflection.runId, reasons }, ...s.dnaLog] : s.dnaLog,
        notices: s.notices.map((n) => (n.href === `/runs/${a.reflection.runId}/reflect` ? { ...n, read: true } : n)),
      };
    }
    case "character":
      return { ...s, players: s.players.map((p) => (p.id === s.meId ? { ...p, character: a.config, nickname: a.nickname } : p)) };
    case "joinSquad":
      return {
        ...s,
        squads: s.squads.map((q) => (q.id === a.squadId && !q.members.includes(s.meId) ? { ...q, members: [...q.members, s.meId] } : q)),
        activity: [{ id: uid("a"), at: now(), text: `You joined ${s.squads.find((q) => q.id === a.squadId)?.name}`, kind: "squad" }, ...s.activity],
      };
    case "leaveSquad":
      return { ...s, squads: s.squads.map((q) => (q.id === a.squadId ? { ...q, members: q.members.filter((m) => m !== s.meId) } : q)) };
    case "acceptChallenge":
      return { ...s, challenges: s.challenges.map((c) => (c.id === a.id ? { ...c, status: "accepted" } : c)) };
    case "courtSubmission":
      return { ...s, courtSubmissions: [a.sub, ...s.courtSubmissions] };
    case "interest":
      return { ...s, interests: { ...s.interests, [a.oppId]: { at: now(), shareCard: a.shareCard } } };
    case "withdrawInterest": {
      const next = { ...s.interests };
      delete next[a.oppId];
      return { ...s, interests: next };
    }
    case "readNotice":
      return { ...s, notices: s.notices.map((n) => (n.id === a.id ? { ...n, read: true } : n)) };
    case "block":
      return { ...s, blocked: s.blocked.includes(a.playerId) ? s.blocked : [...s.blocked, a.playerId] };
    case "addFriend":
      return s.friends.includes(a.playerId) || a.playerId === s.meId ? s : { ...s, friends: [...s.friends, a.playerId] };
    case "removeFriend":
      return { ...s, friends: s.friends.filter((f) => f !== a.playerId) };
    case "queueJoin": {
      const q = (s.queues[a.courtId] ?? []).filter((e) => e.playerId !== s.meId);
      return { ...s, queues: { ...s.queues, [a.courtId]: [...q, { id: uid("q"), playerId: s.meId, size: a.size, at: now() }] } };
    }
    case "queueLeave":
      return { ...s, queues: { ...s.queues, [a.courtId]: (s.queues[a.courtId] ?? []).filter((e) => e.playerId !== s.meId) } };
    case "queueAdvance": {
      const q = s.queues[a.courtId] ?? [];
      if (!q.length) return s;
      const up = q[0];
      return {
        ...s,
        queues: { ...s.queues, [a.courtId]: q.slice(1) },
        notices: up.playerId === s.meId ? [{ id: uid("n"), at: now(), title: "You've got next", body: `Your group is up at ${s.courts.find((c) => c.id === a.courtId)?.name}. Head to the court.`, href: `/courts?c=${a.courtId}`, read: false }, ...s.notices] : s.notices,
      };
    }
    case "tally": {
      const t = s.tallies[a.runId] ?? { a: 0, b: 0, mine: 0, log: [] };
      const next = { ...t, [a.k]: Math.max(0, t[a.k] + a.v), log: [...t.log, { k: a.k, v: a.v, at: now() }] };
      return { ...s, tallies: { ...s.tallies, [a.runId]: next } };
    }
    case "undoTally": {
      const t = s.tallies[a.runId];
      if (!t || !t.log.length) return s;
      const last = t.log[t.log.length - 1];
      return { ...s, tallies: { ...s.tallies, [a.runId]: { ...t, [last.k]: Math.max(0, t[last.k] - last.v), log: t.log.slice(0, -1) } } };
    }
    case "bump": {
      // Two phones brought together confirm each other's lines at once.
      const r1 = patchRun(s, a.runId, (r) => ({
        ...r,
        submissions: r.submissions.map((x) =>
          x.playerId === s.meId && !x.confirmedBy.includes(a.playerId) ? { ...x, confirmedBy: [...x.confirmedBy, a.playerId], disputedBy: x.disputedBy.filter((d) => d !== a.playerId) }
          : x.playerId === a.playerId && !x.confirmedBy.includes(s.meId) ? { ...x, confirmedBy: [...x.confirmedBy, s.meId], disputedBy: x.disputedBy.filter((d) => d !== s.meId) }
          : x),
      }));
      return { ...r1, bumped: { ...s.bumped, [a.runId]: [...new Set([...(s.bumped[a.runId] ?? []), a.playerId])] } };
    }
    case "report":
      return { ...s, reports: [...s.reports, { playerId: a.playerId, reason: a.reason, at: now() }] };
  }
}

const KEY = "runit-demo-v5";

interface Ctx {
  state: State;
  hydrated: boolean;
  dispatch: React.Dispatch<Action>;
  me: Player;
  player: (id: string) => Player | undefined;
  court: (id: string) => Court | undefined;
  createRun: (input: NewRunInput) => string;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, fresh);
  const hydratedRef = useRef(false);
  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (parsed.version === 5) dispatch({ type: "hydrate", state: parsed });
      }
    } catch {
      /* storage unavailable — stay on in-memory seed */
    }
    hydratedRef.current = true;
    force();
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const player = useCallback((id: string) => state.players.find((p) => p.id === id), [state.players]);
  const court = useCallback((id: string) => state.courts.find((c) => c.id === id), [state.courts]);

  const createRun = useCallback(
    (input: NewRunInput) => {
      const id = uid("r");
      const prefix = (state.courts.find((c) => c.id === input.courtId)?.name ?? "RUN").replace(/[^A-Z]/g, "").slice(0, 3).padEnd(3, "X");
      const run: Run = {
        id, ...input, hostId: state.meId, participants: [state.meId], checkedIn: [], teams: null,
        status: "open", code: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`, submissions: [],
      };
      dispatch({ type: "createRun", run });
      return id;
    },
    [state.courts, state.meId]
  );

  const value = useMemo<Ctx>(
    () => ({ state, hydrated: hydratedRef.current, dispatch, me: state.players.find((p) => p.id === state.meId)!, player, court, createRun }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, player, court, createRun, hydratedRef.current]
  );
  if (!hydratedRef.current) {
    return (
      <div className="grid min-h-[60vh] place-items-center" aria-busy="true" aria-label="Loading ruNit">
        <svg viewBox="0 0 40 40" width="44" height="44" className="bounce-ball"><circle cx="20" cy="20" r="18" fill="#F47B35" /><path d="M2 20h36M20 2v36M8 8c5 5 5 19 0 24M32 8c-5 5-5 19 0 24" stroke="#202B30" strokeWidth="1.5" fill="none" opacity=".6" /></svg>
      </div>
    );
  }
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

export const RESET_KEY = KEY;
