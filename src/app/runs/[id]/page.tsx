"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, verificationOf } from "@/lib/store";
import type { Run, StatLine, StatSubmission } from "@/lib/types";
import { balanceTeams, EMPTY_LINE, simulateOthers, teamPoints, when } from "@/lib/util";
import { archetypeName } from "@/lib/archetypes";
import { Avatar } from "@/components/PlayerFigure";
import { BackLink, CourtArt, DemoTag, StatBadge } from "@/components/ui";
import { Qr } from "@/components/Qr";
import { CourtRun } from "@/components/CourtRun";
import { LiveScoreboard } from "@/components/LiveScoreboard";
import { BumpConfirm } from "@/components/BumpConfirm";
import { GameCard } from "@/components/GameCard";
import { swish } from "@/lib/feel";
import { I } from "@/components/icons";

const STEPS = ["Join", "Check in", "Teams", "Play", "Score", "Stats", "Confirm", "Reflect"];

function stepOf(run: Run, me: string): number {
  if (!run.participants.includes(me)) return 0;
  if (run.status === "reviewed") return 7;
  if (run.status === "final") return run.submissions.length ? 6 : 5;
  if (run.status === "live") return 3;
  if (!run.checkedIn.includes(me)) return 1;
  return 2;
}

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, court, player, dispatch } = useStore();
  const search = useSearchParams();
  const run = state.runs.find((r) => r.id === id);

  // DEMO: on runs you host, nearby demo players join over a few seconds.
  useEffect(() => {
    if (!run || run.hostId !== state.meId || run.status !== "open") return;
    const pool = state.players.filter((p) => p.id !== state.meId && !run.participants.includes(p.id) && !state.blocked.includes(p.id) && p.city.includes(court(run.courtId)!.city.split(" ").pop()!));
    const fallback = state.players.filter((p) => p.id !== state.meId && !run.participants.includes(p.id));
    const next = pool[0] ?? fallback[0];
    if (!next || run.participants.length >= run.capacity) return;
    const t = setTimeout(() => dispatch({ type: "simJoin", runId: run.id, playerId: next.id }), 1600);
    return () => clearTimeout(t);
  }, [run, state.players, state.meId, state.blocked, dispatch, court]);

  if (!run) return <div className="py-20 text-center"><div className="display text-4xl">Run not found</div><Link href="/" className="btn-ball mt-6">Back home</Link></div>;

  const c = court(run.courtId)!;
  const host = player(run.hostId)!;
  const step = stepOf(run, state.meId);
  const isHost = run.hostId === state.meId;

  const FW: Record<string, string> = { "1v1": "One on one", "2v2": "Twos", "3v3": "Threes", "5v5": "Fives" };
  const courtSide = step !== 3;
  return (
    <div>
      <BackLink href="/" label="Home" />
      {search.get("new") && run.participants.length < run.capacity && (
        <div className="rise mb-6 border-l-4 border-emerald py-1 pl-4 text-[15px]" role="status">
          <b>Your run is posted.</b> Share code <span className="num text-lg">{run.code}</span> with your people. In this demo, made-up nearby players will take the open spots.
        </div>
      )}

      <header>
        <p className="text-[15px] font-semibold text-ink-2">{when(run.startsAt)}{run.recurring ? `, repeats ${run.recurring.toLowerCase()}` : ""}</p>
        <h1 className="display mt-1 text-[clamp(2.8rem,7vw,5rem)]">{run.title}</h1>
        <p className="mt-2 max-w-2xl text-lg text-ink-2">
          {FW[run.format]} to {run.target} at <Link href={`/courts?c=${c.id}`} className="font-semibold text-ink underline decoration-2 underline-offset-4">{c.name}</Link>.
          {" "}{run.mode === "ranked" ? "Ranked, so it counts toward MMR." : "Casual."} {run.visibility === "private" ? "Invite only." : ""} Hosted by {isHost ? "you" : host.nickname}.
        </p>
        {run.requirement && <p className="mt-4 max-w-2xl border-l-4 border-ball pl-4 text-[15px]">{run.requirement}</p>}

        <ol className="mt-8 flex gap-x-5 gap-y-2 overflow-x-auto pb-1 text-[15px]" aria-label="Game progress">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined} className={`flex shrink-0 items-center gap-1.5 border-b-4 pb-1.5 ${i === step ? "border-ball font-bold text-ink" : i < step ? "border-transparent text-ink-2" : "border-transparent text-ink-3"}`}>
              {i < step ? <I.Check width={15} height={15} className="text-emerald" /> : <span className="num text-base">{i + 1}</span>}
              {s}
            </li>
          ))}
        </ol>
      </header>

      <div className={`mt-8 grid items-start gap-10 ${courtSide ? "lg:grid-cols-[minmax(0,460px)_1fr]" : ""}`}>
        {courtSide && (
          <div className="lg:sticky lg:top-24">
            <CourtRun run={run} onJoin={step === 0 ? () => dispatch({ type: "join", runId: run.id }) : undefined} />
            <p className="mt-3 text-sm text-ink-2">
              {run.participants.length} of {run.capacity} spots taken{run.checkedIn.length && run.status !== "reviewed" && run.status !== "final" ? `, ${run.checkedIn.length} at the court` : ""}.
              {run.teams && step >= 2 ? " Light side is Shirts, the guarding side is Skins." : ""}
            </p>
          </div>
        )}
        <div className="min-w-0 space-y-8">
          {step === 0 && <JoinPanel run={run} />}
          {(step === 1 || step === 2) && <CheckInPanel run={run} isHost={isHost} />}
          {step === 2 && <TeamsPanel run={run} isHost={isHost} />}
          {step === 3 && <LivePanel run={run} />}
          {step === 5 && <StatsEntry run={run} />}
          {step === 6 && <ReviewPanel run={run} />}
          {step === 7 && <DonePanel run={run} />}
          {step < 3 && <RosterPanel run={run} />}
          {step < 3 && run.participants.includes(state.meId) && !isHost && (
            <button className="btn-ghost px-0 text-warn" onClick={() => dispatch({ type: "leave", runId: run.id })}>Can&apos;t make it? Leave the run</button>
          )}
        </div>
      </div>
    </div>
  );
}

function JoinPanel({ run }: { run: Run }) {
  const { dispatch } = useStore();
  const open = run.capacity - run.participants.length;
  return (
    <div className="panel flex flex-wrap items-center justify-between gap-4 pt-5">
      <div>
        <div className="display text-2xl">{open > 0 ? `${open} ${open === 1 ? "spot" : "spots"} open` : "Run is full"}</div>
        <p className="text-sm text-ink-2">Joining tells the host you&apos;re coming. No-shows lower your Trust score; cancelling ahead doesn&apos;t.</p>
      </div>
      <button className="btn-ball px-8 py-3" disabled={open <= 0} onClick={() => dispatch({ type: "join", runId: run.id })}>Join run</button>
    </div>
  );
}

function CheckInPanel({ run, isHost }: { run: Run; isHost: boolean }) {
  const { state, dispatch } = useStore();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const mine = run.checkedIn.includes(state.meId);
  const doCheckIn = () => dispatch({ type: "checkIn", runId: run.id, playerId: state.meId });
  const notHere = run.participants.filter((p) => !run.checkedIn.includes(p) && p !== state.meId);

  if (mine) {
    return (
      <div className="panel flex flex-wrap items-center gap-5 pt-5">
        <div className="rounded-xl bg-paper p-2"><Qr value={`runit:${run.code}`} size={96} /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-emerald"><I.Check /><span className="font-bold">You&apos;re checked in</span></div>
          <p className="mt-1 text-sm text-ink-2">Others check in by scanning this or typing <span className="num font-bold text-ink">{run.code}</span>.</p>
          <p className="mt-1 text-sm text-ink-2"><span className="num font-bold text-ink">{run.checkedIn.length}</span> of {run.participants.length} here.</p>
        </div>
        {notHere.length > 0 && (
          <button className="btn-line" onClick={() => notHere.forEach((p, i) => setTimeout(() => dispatch({ type: "checkIn", runId: run.id, playerId: p }), i * 350))}>
            <DemoTag>Demo</DemoTag> Simulate arrivals
          </button>
        )}
        {isHost && run.participants.length < run.capacity && <p className="w-full text-xs text-ink-3">Waiting on {run.capacity - run.participants.length} more to join.</p>}
      </div>
    );
  }

  return (
    <div className="panel grid gap-6 pt-5 sm:grid-cols-[1fr_auto]">
      <div>
        <div className="eyebrow mb-1">At the court?</div>
        <div className="display text-[2rem]">Check in</div>
        <p className="mt-1 text-sm text-ink-2">Scan the host&apos;s code or type it. Checking in is how RUN IT knows who actually showed up — it&apos;s the backbone of Trust.</p>
        <form className="mt-4 flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          if (code.trim().toUpperCase() !== run.code) return setErr("That code doesn't match this run. Ask the host to show theirs.");
          setErr(null); doCheckIn();
        }}>
          <input className="field num " placeholder={run.code.replace(/\d/g, "0")} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Game code" maxLength={8} />
          <button className="btn-ink shrink-0">Check in</button>
        </form>
        {err && <p className="mt-2 text-sm font-semibold text-warn" role="alert">{err}</p>}
        <p className="mt-2 text-xs text-ink-3">Demo hint: this run&apos;s code is <span className="num font-bold">{run.code}</span>.</p>
      </div>
      <div className="scope-night flex flex-col items-center justify-center rounded-2xl bg-ink p-5 text-paper">
        <div className={`grid h-28 w-28 place-items-center rounded-xl border-2 ${scanning ? "border-sun" : "border-paper/30"} border-dashed`}>
          {scanning ? <span className="text-xs text-sun">Reading…</span> : <I.Qr width={40} height={40} />}
        </div>
        <button className="btn-ball mt-4" disabled={scanning} onClick={() => { setScanning(true); setTimeout(() => { setScanning(false); doCheckIn(); }, 900); }}>
          {scanning ? "Scanning…" : "Scan QR"}
        </button>
        <span className="mt-2 text-[10px] text-paper/50">Simulated camera in demo</span>
      </div>
    </div>
  );
}

function TeamsPanel({ run, isHost }: { run: Run; isHost: boolean }) {
  const { state, dispatch, player } = useStore();
  const size = { "1v1": 1, "2v2": 2, "3v3": 3, "5v5": 5 }[run.format];
  const ready = run.checkedIn.length >= size * 2;
  const teams = run.teams ?? (ready ? balanceTeams(run.checkedIn.slice(0, size * 2), state.players) : null);
  useEffect(() => {
    if (!run.teams && teams) dispatch({ type: "setTeams", runId: run.id, teams });
  }, [run.teams, teams, run.id, dispatch]);
  if (!teams) {
    return <div className="rounded-2xl border border-dashed border-ink/20 p-5 text-sm text-ink-2">Teams form when {size * 2} players have checked in. <span className="num font-bold text-ink">{run.checkedIn.length}/{size * 2}</span></div>;
  }
  const avg = (ids: string[]) => Math.round(ids.reduce((t, id) => t + (player(id)?.mmr ?? 0), 0) / ids.length);
  const swap = (id: string) => {
    if (!isHost) return;
    const inA = teams.a.includes(id);
    const from = inA ? teams.a : teams.b, to = inA ? teams.b : teams.a;
    const partner = to[to.length - 1];
    const nf = from.map((x) => (x === id ? partner : x)), nt = to.map((x) => (x === partner ? id : x));
    dispatch({ type: "setTeams", runId: run.id, teams: inA ? { a: nf, b: nt } : { a: nt, b: nf } });
  };
  return (
    <div className="panel pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
                    <div className="display text-[2rem]">Shirts vs Skins</div>
          <p className="text-sm text-ink-2">{run.mode === "ranked" ? "Balanced by rating." : "Auto-picked."} {isHost ? "Tap a player to swap sides." : "The host can swap players."}</p>
        </div>
        {isHost ? (
          <button className="btn-ball px-7 py-3" onClick={() => dispatch({ type: "tipOff", runId: run.id })}>Tip off</button>
        ) : (
          <button className="btn-line" onClick={() => dispatch({ type: "tipOff", runId: run.id })}><DemoTag>Demo</DemoTag> Host tips off</button>
        )}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {(["a", "b"] as const).map((t) => (
          <div key={t} className={`rounded-lg p-3 ${t === "a" ? "bg-paper-warm" : "scope-night bg-ink text-paper"}`}>
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="display text-xl">{t === "a" ? "Shirts" : "Skins"}</span>
              {run.mode === "ranked" && <span className={`num text-[11px] ${t === "a" ? "text-ink-3" : "text-paper/50"}`}>avg {avg(teams[t])}</span>}
            </div>
            <ul className="space-y-1">
              {teams[t].map((id) => {
                const p = player(id)!;
                return (
                  <li key={id}>
                    <button disabled={!isHost} onClick={() => swap(id)} className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left ${isHost ? (t === "a" ? "hover:bg-surface" : "hover:bg-white/10") : ""}`}>
                      <Avatar config={p.character} size={30} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.nickname}{id === state.meId && " (you)"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function LivePanel({ run }: { run: Run }) {
  return <LiveScoreboard run={run} />;
}

const STAT_FIELDS: { k: keyof StatLine; label: string; max: number }[] = [
  { k: "pts", label: "Points", max: 60 }, { k: "ast", label: "Assists", max: 30 }, { k: "reb", label: "Rebounds", max: 40 },
  { k: "stl", label: "Steals", max: 20 }, { k: "blk", label: "Blocks", max: 20 }, { k: "tov", label: "Turnovers", max: 20 },
];

function StatsEntry({ run }: { run: Run }) {
  const { state, dispatch } = useStore();
  const tallied = state.tallies[run.id]?.mine ?? 0;
  const [line, setLine] = useState<StatLine>({ ...EMPTY_LINE, pts: tallied });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const onA = run.teams!.a.includes(state.meId);
  const teamScore = onA ? run.score!.a : run.score!.b;
  const won = onA ? run.score!.a > run.score!.b : run.score!.b > run.score!.a;
  const set = (k: keyof StatLine, v: number) => setLine((l) => ({ ...l, [k]: Math.max(0, Math.min(STAT_FIELDS.find((f) => f.k === k)!.max, v)) }));
  const submit = () => {
    if (line.pts > teamScore) return setErr(`Your team scored ${teamScore}. Your points can't be higher than that.`);
    setErr(null); setSaving(true);
    setTimeout(() => {
      dispatch({ type: "submitStats", runId: run.id, mine: line, others: simulateOthers(run, state.meId, line.pts) });
      setSaving(false);
    }, 700);
  };
  return (
    <div className="panel pt-5 ">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="eyebrow">Final, {won ? "you won" : "you lost"} {onA ? `${run.score!.a}–${run.score!.b}` : `${run.score!.b}–${run.score!.a}`}</div>
          <div className="display text-[2.2rem]">Your box score</div>
        </div>
        <span className="text-sm text-ink-2">{tallied ? `Points filled in from the scoreboard (${tallied}).` : "Just your own line. Takes 20 seconds."}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STAT_FIELDS.map((f) => (
          <div key={f.k} className={`rounded-2xl border p-3 ${f.k === "pts" ? "border-ball/40 bg-ball/[.06]" : "border-paper-line bg-paper"}`}>
            <div className="text-xs font-semibold text-ink-2">{f.label}</div>
            <div className="mt-1 flex items-center justify-between">
              <button aria-label={`Decrease ${f.label}`} className="grid h-9 w-9 place-items-center rounded-full bg-ink/5 text-lg font-bold" onClick={() => set(f.k, line[f.k] - 1)}>−</button>
              <input aria-label={f.label} inputMode="numeric" className="num w-12 bg-transparent text-center text-3xl font-bold focus:outline-none" value={line[f.k]} onChange={(e) => set(f.k, parseInt(e.target.value.replace(/\D/g, "") || "0", 10))} />
              <button aria-label={`Increase ${f.label}`} className="grid h-9 w-9 place-items-center rounded-full bg-ink text-lg font-bold text-paper" onClick={() => set(f.k, line[f.k] + 1)}>+</button>
            </div>
          </div>
        ))}
      </div>
      {err && <p className="mt-3 text-sm font-semibold text-warn" role="alert">{err}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-sm text-xs text-ink-3">Your line starts as <b>self-reported</b>. It becomes confirmed when teammates and opponents agree with it.</p>
        <button className="btn-ball px-7 py-3" disabled={saving} onClick={submit}>{saving ? "Comparing with the other players…" : "Submit my stats"}</button>
      </div>
    </div>
  );
}

function ReviewPanel({ run }: { run: Run }) {
  const { state, dispatch, player } = useStore();
  const router = useRouter();
  const [asked, setAsked] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const mine = run.submissions.find((s) => s.playerId === state.meId)!;
  const teams = run.teams!;
  const myTeam: "a" | "b" = teams.a.includes(state.meId) ? "a" : "b";

  const issues = useMemo(() => {
    const out: { team: "a" | "b"; reported: number; final: number; suspect?: StatSubmission }[] = [];
    (["a", "b"] as const).forEach((t) => {
      const reported = teamPoints(run, t), final = run.score![t];
      if (reported !== final) {
        const subs = run.submissions.filter((s) => teams[t].includes(s.playerId) && s.playerId !== state.meId).sort((x, y) => y.line.pts - x.line.pts);
        out.push({ team: t, reported, final, suspect: subs[0] });
      }
    });
    return out;
  }, [run, teams, state.meId]);

  const myV = verificationOf(mine, run);
  const toConfirm = run.submissions.filter((s) => s.playerId !== state.meId);
  const reviewed = toConfirm.filter((s) => s.confirmedBy.includes(state.meId) || s.disputedBy.includes(state.meId)).length;

  const askRecheck = (s: StatSubmission) => {
    setAsked(s.playerId);
    setTimeout(() => {
      const diff = teamPoints(run, myTeam === "a" ? "a" : "b") - run.score![myTeam];
      dispatch({ type: "reviseSub", runId: run.id, playerId: s.playerId, line: { ...s.line, pts: Math.max(0, s.line.pts - Math.max(0, diff)) } });
      setAsked(null);
    }, 1400);
  };

  const requestConfirmations = () => {
    setRequesting(true);
    const mates = teams[myTeam].filter((id) => id !== state.meId);
    const opps = teams[myTeam === "a" ? "b" : "a"];
    [...mates, ...opps.slice(0, 1)].forEach((id, i) => setTimeout(() => dispatch({ type: "confirmSub", runId: run.id, playerId: state.meId, by: id }), 700 + i * 700));
    setTimeout(() => setRequesting(false), 700 + (mates.length + 1) * 700);
  };

  return (
    <div className="space-y-5">
      {issues.map((x) => (
        <div key={x.team} className="rise border-l-4 border-sun bg-sun-soft/60 py-5 pl-5 pr-4" role="alert">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sun text-ink"><I.Flag width={18} height={18} /></span>
            <div className="flex-1">
              <div className="font-bold">{x.team === "a" ? "Shirts" : "Skins"} points don&apos;t add up</div>
              <p className="mt-1 text-sm text-ink-2">Individual lines total <b className="num text-ink">{x.reported}</b>, but the final was <b className="num text-ink">{x.final}</b>. Nobody&apos;s accused of anything — someone just needs to recheck.</p>
              {x.team === myTeam && x.suspect && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-ink py-2" disabled={!!asked} onClick={() => askRecheck(x.suspect!)}>
                    {asked ? `Waiting on ${player(asked)?.nickname}…` : `Ask ${player(x.suspect.playerId)?.nickname} to recheck`}
                  </button>
                  <button className="btn-line py-2" onClick={() => dispatch({ type: "submitStats", runId: run.id, mine: { ...mine.line, pts: Math.max(0, mine.line.pts - (x.reported - x.final)) }, others: run.submissions.filter((s) => s.playerId !== state.meId) })}>Lower my points by {x.reported - x.final}</button>
                </div>
              )}
              <p className="mt-2 text-[11px] text-ink-3">RUN IT flags mismatches; it never decides who&apos;s right. Players in the game resolve it.</p>
            </div>
          </div>
        </div>
      ))}

      {issues.length === 0 && <BumpConfirm run={run} />}

      <div className="scope-night board overflow-hidden rounded-[22px] bg-night text-paper">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5">
          <div className="display text-[2.2rem]">Box score</div>
          <div className="flex items-center gap-2 text-sm text-paper/70">Your line <StatBadge v={myV} /></div>
        </div>
        {(["a", "b"] as const).map((t) => {
          const sum = teamPoints(run, t), off = sum !== run.score![t];
          return (
            <div key={t} className={`mx-3 mb-3 rounded-2xl ${off ? "ring-2 ring-ball shadow-[0_0_28px_rgba(244,123,53,.45)]" : "ring-1 ring-white/10"}`}>
              <div className="flex items-center justify-between px-4 pb-1 pt-3">
                <span className="text-[15px] font-bold">{t === "a" ? "Shirts" : "Skins"}</span>
                <span className="text-sm text-paper/70">Final <span className="num text-xl text-sun">{run.score![t]}</span>{"  "}
                  <span className={off ? "font-bold text-ball-ink" : ""}>Lines add to <span className="num text-xl">{sum}</span></span></span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px]">
                  <thead><tr className="text-[12px] text-paper/50">
                    <th className="px-4 py-1.5 text-left font-semibold">Player</th>
                    {["PTS", "AST", "REB", "STL", "BLK", "TO"].map((h) => <th key={h} className="px-2 py-1.5 text-right font-semibold">{h}</th>)}
                    <th className="px-4 py-1.5 text-right font-semibold"><span className="sr-only">Status</span></th>
                  </tr></thead>
                  <tbody>
                    {run.submissions.filter((s) => teams[t].includes(s.playerId)).map((s) => {
                      const p = player(s.playerId)!;
                      const isMe = s.playerId === state.meId;
                      const conf = s.confirmedBy.includes(state.meId), disp = s.disputedBy.includes(state.meId);
                      const suspect = off && issues.some((x) => x.suspect?.playerId === s.playerId);
                      return (
                        <tr key={s.playerId} className={`border-t border-white/10 ${isMe ? "bg-white/[.05]" : ""} ${suspect ? "bg-ball/[.12]" : ""}`}>
                          <td className="px-4 py-2.5"><div className="flex items-center gap-2"><Avatar config={p.character} size={28} /><span className="font-semibold">{isMe ? "You" : p.nickname}</span>{s.revised && <span className="rounded bg-sky/25 px-1.5 text-[11px] font-bold text-sky">revised</span>}</div></td>
                          {(["pts", "ast", "reb", "stl", "blk", "tov"] as const).map((k) => <td key={k} className={`num px-2 py-2.5 text-right ${k === "pts" ? "text-[26px] text-sun" : "text-xl text-paper/85"}`}>{s.line[k]}</td>)}
                          <td className="px-4 py-2.5 text-right">
                            {isMe ? (s.confirmedBy.length ? <span className="text-sm font-bold text-emerald">✓ {s.confirmedBy.length}</span> : <span className="text-sm text-paper/50">Waiting</span>) : (
                              <div className="flex justify-end gap-1">
                                <button aria-pressed={conf} className={`rounded-full px-3 py-1 text-sm font-bold ${conf ? "bg-emerald text-on-emerald" : "bg-white/10 hover:bg-emerald/40"}`} onClick={() => dispatch({ type: "confirmSub", runId: run.id, playerId: s.playerId, by: state.meId })}>{conf ? "✓ Confirmed" : "Confirm"}</button>
                                <button aria-pressed={disp} className={`rounded-full px-3 py-1 text-sm font-bold ${disp ? "bg-warn text-on-warn" : "bg-white/10 hover:bg-warn/50"}`} onClick={() => dispatch({ type: "disputeSub", runId: run.id, playerId: s.playerId, by: state.meId })}>{disp ? "Disputed" : "Dispute"}</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
          <div className="text-sm text-paper/70">You&apos;ve reviewed <b className="num text-lg text-paper">{reviewed}/{toConfirm.length}</b> other lines.</div>
          <div className="flex flex-wrap gap-2">
            {myV !== "opponent" && (
              <button className="btn border-2 border-paper/30 text-paper hover:bg-white/10" disabled={issues.length > 0 || requesting} title={issues.length ? "Resolve the mismatch first" : undefined} onClick={requestConfirmations}>
                {requesting ? "Players confirming…" : "Ask everyone to confirm"} <span className="rounded border border-dashed border-paper/40 px-1 text-[10px] font-bold">SIM</span>
              </button>
            )}
            <button className="btn-ball" disabled={issues.length > 0} onClick={() => { swish(); dispatch({ type: "finishReview", runId: run.id }); router.push(`/runs/${run.id}/reflect`); }}>
              Save to My Game
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-ink-3">Verification ladder: self-reported → teammate-confirmed → opponent-confirmed → video-supported. Video upload isn&apos;t in this demo build.</p>
    </div>
  );
}

function DonePanel({ run }: { run: Run }) {
  const { state } = useStore();
  const rec = state.history.find((h) => h.runId === run.id);
  const reflected = state.reflections.some((r) => r.runId === run.id);
  return (
    <div className="panel pt-6">
      <div className="eyebrow">Saved to My Game</div>
      <div className="display mt-1 text-[2.4rem]">{rec?.result === "W" ? "Dub." : "Run it back."} <span className="num text-ink-2">{rec?.score}</span></div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        {rec && <StatBadge v={rec.verification} />}
        {rec?.mmrDelta !== undefined && <span className={`num font-bold ${rec.mmrDelta >= 0 ? "text-emerald" : "text-warn"}`}>{rec.mmrDelta >= 0 ? "+" : ""}{rec.mmrDelta} MMR</span>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {!reflected && <Link href={`/runs/${run.id}/reflect`} className="btn-ball">How did you get your points?</Link>}
        <Link href="/my-game" className="btn-line">Open My Game</Link>
      </div>
      {rec && <GameCard run={run} />}
    </div>
  );
}

function RosterPanel({ run }: { run: Run }) {
  const { state, player } = useStore();
  const empty = run.capacity - run.participants.length;
  return (
    <div>
      <h2 className="display mb-2 text-[1.8rem]">Who&apos;s coming</h2>
      <ul className="grid gap-x-8 sm:grid-cols-2">
        {run.participants.map((id) => {
          const p = player(id)!;
          const here = run.checkedIn.includes(id);
          return (
            <li key={id} className="flex items-center gap-3 border-t border-ink/10 py-3">
              <Avatar config={p.character} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.nickname}{id === state.meId && " (you)"}{id === run.hostId && <span className="ml-1.5 text-[10px] font-bold text-ball-ink">host</span>}</div>
                <div className="truncate text-xs text-ink-3">{archetypeName(p.dna, p.position)}, Trust {p.trust.attendance}%</div>
              </div>
              {here ? <span className="flex items-center gap-1 text-xs font-bold text-emerald"><I.Check width={14} height={14} />Here</span> : <span className="text-xs text-ink-3">Coming</span>}
            </li>
          );
        })}
        {Array.from({ length: empty }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 border-t border-ink/10 py-3 text-ink-3">
            <span className="h-9 w-9 rounded-full border-2 border-dashed border-ink/25" /> Open spot
          </li>
        ))}
      </ul>
    </div>
  );
}
