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

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/" label="Home" />
      {search.get("new") && run.participants.length < run.capacity && (
        <div className="rise mb-4 flex items-center gap-3 rounded-2xl bg-emerald px-4 py-3 text-sm text-paper">
          <I.Check /> <span><b>Your run is live.</b> Share code <span className="num font-bold">{run.code}</span>. <span className="opacity-80">(Demo: fictional nearby players will join on their own.)</span></span>
        </div>
      )}

      <header className="relative overflow-hidden rounded-[26px] bg-ink px-6 pb-6 pt-7 text-paper sm:px-8">
        <CourtArt className="pointer-events-none absolute -right-16 -top-10 h-[360px]" stroke="#F4C65E" opacity={0.14} />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow !text-sun">{when(run.startsAt)}</span>
            {run.mode === "ranked" && <span className="rounded bg-ball px-1.5 py-px text-[10px] font-bold uppercase tracking-wider">Ranked</span>}
            {run.visibility === "private" && <span className="rounded border border-paper/30 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider">Invite only</span>}
          </div>
          <h1 className="display mt-2 text-[2.6rem] sm:text-[3.6rem]">{run.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-paper/75">
            <Link href={`/courts?c=${c.id}`} className="inline-flex items-center gap-1 hover:text-paper"><I.Pin width={15} height={15} />{c.name}</Link>
            <span>{run.format} · first to {run.target}</span>
            <span>Host: {host.nickname}</span>
            {run.recurring && <span>{run.recurring}</span>}
          </div>
          {run.requirement && <p className="mt-3 text-sm text-paper/90">“{run.requirement}”</p>}
        </div>

        {/* Game loop rail */}
        <ol className="relative mt-7 grid grid-cols-8 gap-1" aria-label="Game progress">
          {STEPS.map((s, i) => (
            <li key={s} className="text-center">
              <div className={`h-1.5 rounded-full ${i < step ? "bg-sun" : i === step ? "bg-ball" : "bg-paper/15"}`} />
              <div className={`mt-1.5 hidden text-[10px] font-bold uppercase tracking-wider sm:block ${i === step ? "text-paper" : "text-paper/45"}`}>{s}</div>
            </li>
          ))}
        </ol>
        <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-paper/70 sm:hidden">Step {step + 1} · {STEPS[step]}</div>
      </header>

      <div className="mt-6 space-y-6">
        {step === 0 && <JoinPanel run={run} />}
        {(step === 1 || step === 2) && <CheckInPanel run={run} isHost={isHost} />}
        {step === 2 && <TeamsPanel run={run} isHost={isHost} />}
        {step === 3 && <LivePanel run={run} />}
        {step === 5 && <StatsEntry run={run} />}
        {step === 6 && <ReviewPanel run={run} />}
        {step === 7 && <DonePanel run={run} />}
        {step < 3 && <RosterPanel run={run} />}
        {step < 3 && run.participants.includes(state.meId) && !isHost && (
          <button className="btn-ghost text-[#b4441a]" onClick={() => dispatch({ type: "leave", runId: run.id })}>Can&apos;t make it — leave run</button>
        )}
      </div>
    </div>
  );
}

function JoinPanel({ run }: { run: Run }) {
  const { dispatch } = useStore();
  const open = run.capacity - run.participants.length;
  return (
    <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
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
      <div className="panel flex flex-wrap items-center gap-5 p-5">
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
    <div className="panel grid gap-6 p-5 sm:grid-cols-[1fr_auto]">
      <div>
        <div className="eyebrow mb-1">At the court?</div>
        <div className="display text-[2rem]">Check in</div>
        <p className="mt-1 text-sm text-ink-2">Scan the host&apos;s code or type it. Checking in is how ruNit knows who actually showed up — it&apos;s the backbone of Trust.</p>
        <form className="mt-4 flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          if (code.trim().toUpperCase() !== run.code) return setErr("That code doesn't match this run. Ask the host to show theirs.");
          setErr(null); doCheckIn();
        }}>
          <input className="field num uppercase tracking-widest" placeholder={run.code.replace(/\d/g, "0")} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Game code" maxLength={8} />
          <button className="btn-ink shrink-0">Check in</button>
        </form>
        {err && <p className="mt-2 text-sm font-semibold text-[#b4441a]" role="alert">{err}</p>}
        <p className="mt-2 text-xs text-ink-3">Demo hint: this run&apos;s code is <span className="num font-bold">{run.code}</span>.</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl bg-ink p-5 text-paper">
        <div className={`grid h-28 w-28 place-items-center rounded-xl border-2 ${scanning ? "border-sun" : "border-paper/30"} border-dashed`}>
          {scanning ? <span className="text-xs text-sun">Reading…</span> : <I.Qr width={40} height={40} />}
        </div>
        <button className="btn-ball mt-4" disabled={scanning} onClick={() => { setScanning(true); setTimeout(() => { setScanning(false); doCheckIn(); }, 900); }}>
          {scanning ? "Scanning…" : "Scan QR"}
        </button>
        <span className="mt-2 text-[10px] uppercase tracking-wider text-paper/50">Simulated camera in demo</span>
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
    <div className="panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Teams</div>
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
          <div key={t} className={`rounded-2xl p-3 ${t === "a" ? "bg-paper-warm" : "bg-ink text-paper"}`}>
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="display text-xl">{t === "a" ? "Shirts" : "Skins"}</span>
              {run.mode === "ranked" && <span className={`num text-[11px] ${t === "a" ? "text-ink-3" : "text-paper/50"}`}>avg {avg(teams[t])}</span>}
            </div>
            <ul className="space-y-1">
              {teams[t].map((id) => {
                const p = player(id)!;
                return (
                  <li key={id}>
                    <button disabled={!isHost} onClick={() => swap(id)} className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left ${isHost ? (t === "a" ? "hover:bg-white" : "hover:bg-white/10") : ""}`}>
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
  const { dispatch } = useStore();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [entering, setEntering] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const mins = Math.floor((now - t0) / 60000), secs = Math.floor(((now - t0) / 1000) % 60);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const x = parseInt(a, 10), y = parseInt(b, 10);
    if (isNaN(x) || isNaN(y) || x < 0 || y < 0) return setErr("Enter both scores.");
    const hi = Math.max(x, y), lo = Math.min(x, y);
    if (hi === lo) return setErr("Pickup games don't end in a tie.");
    if (hi < run.target) return setErr(`The winner needs at least ${run.target}.`);
    if (hi > run.target && hi - lo !== 2) return setErr(`Past ${run.target}, a win-by-2 game ends exactly 2 apart.`);
    if (hi > run.target + 20) return setErr("That score looks off — check it again.");
    dispatch({ type: "finalScore", runId: run.id, a: x, b: y });
  };

  return (
    <div className="relative overflow-hidden rounded-[26px] bg-[radial-gradient(120%_100%_at_50%_0%,#3a2a1d,#202B30_60%)] p-6 text-paper sm:p-10">
      <CourtArt className="absolute inset-x-0 -bottom-24 mx-auto h-[420px] opacity-80" stroke="#F47B35" opacity={0.18} />
      <div className="relative text-center">
        <div className="mx-auto mb-6 h-14 w-14"><svg viewBox="0 0 40 40" className="bounce-ball"><circle cx="20" cy="20" r="18" fill="#F47B35" /><path d="M2 20h36M20 2v36M8 8c5 5 5 19 0 24M32 8c-5 5-5 19 0 24" stroke="#202B30" strokeWidth="1.5" fill="none" opacity=".7" /></svg></div>
        <div className="display text-[3.4rem] sm:text-[5rem]">Phone down.<br /><span className="text-ball">Go hoop.</span></div>
        <div className="num mt-4 text-2xl text-paper/70">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</div>
        <p className="mx-auto mt-2 max-w-sm text-sm text-paper/60">ruNit stays quiet until the game&apos;s over. Come back when someone hits {run.target}.</p>
        {!entering ? (
          <button className="btn-ball mt-8 px-8 py-3" onClick={() => setEntering(true)}>Game over — enter final</button>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-8 max-w-sm rounded-2xl bg-paper p-5 text-left text-ink">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div><label className="label" htmlFor="sa">Shirts</label><input id="sa" inputMode="numeric" className="field num text-center text-2xl font-bold" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ""))} /></div>
              <span className="pb-3 text-ink-3">–</span>
              <div><label className="label" htmlFor="sb">Skins</label><input id="sb" inputMode="numeric" className="field num text-center text-2xl font-bold" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ""))} /></div>
            </div>
            {err && <p className="mt-3 text-sm font-semibold text-[#b4441a]" role="alert">{err}</p>}
            <button className="btn-ink mt-4 w-full">Save final score</button>
            <p className="mt-2 text-center text-xs text-ink-3">Every player in the game confirms the final too.</p>
          </form>
        )}
      </div>
    </div>
  );
}

const STAT_FIELDS: { k: keyof StatLine; label: string; max: number }[] = [
  { k: "pts", label: "Points", max: 60 }, { k: "ast", label: "Assists", max: 30 }, { k: "reb", label: "Rebounds", max: 40 },
  { k: "stl", label: "Steals", max: 20 }, { k: "blk", label: "Blocks", max: 20 }, { k: "tov", label: "Turnovers", max: 20 },
];

function StatsEntry({ run }: { run: Run }) {
  const { state, dispatch } = useStore();
  const [line, setLine] = useState<StatLine>(EMPTY_LINE);
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
    <div className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="eyebrow">Final · {won ? "you won" : "you lost"} {onA ? `${run.score!.a}–${run.score!.b}` : `${run.score!.b}–${run.score!.a}`}</div>
          <div className="display text-[2.2rem]">Your box score</div>
        </div>
        <span className="text-xs text-ink-3">Just your own line. Takes 20 seconds.</span>
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
      {err && <p className="mt-3 text-sm font-semibold text-[#b4441a]" role="alert">{err}</p>}
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
        <div key={x.team} className="rise rounded-2xl border-2 border-sun bg-sun-soft/70 p-5" role="alert">
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
              <p className="mt-2 text-[11px] text-ink-3">ruNit flags mismatches; it never decides who&apos;s right. Players in the game resolve it.</p>
            </div>
          </div>
        </div>
      ))}

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-line p-5">
          <div>
            <div className="eyebrow">Evidence</div>
            <div className="display text-[2rem]">Box score</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-ink-3">Your line</div>
            <StatBadge v={myV} />
          </div>
        </div>
        {(["a", "b"] as const).map((t) => (
          <div key={t}>
            <div className={`flex items-center justify-between px-5 py-2 text-xs font-bold uppercase tracking-wider ${t === "a" ? "bg-paper-warm" : "bg-ink text-paper"}`}>
              <span>{t === "a" ? "Shirts" : "Skins"} · final <span className="num">{run.score![t]}</span></span>
              <span className="num">Σ {teamPoints(run, t)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-[11px] text-ink-3">
                  <th className="px-5 py-2 text-left font-semibold">Player</th>
                  {["PTS", "AST", "REB", "STL", "BLK", "TO"].map((h) => <th key={h} className="num px-2 py-2 text-right font-semibold">{h}</th>)}
                  <th className="px-5 py-2 text-right font-semibold">Status</th>
                </tr></thead>
                <tbody>
                  {run.submissions.filter((s) => teams[t].includes(s.playerId)).map((s) => {
                    const p = player(s.playerId)!;
                    const isMe = s.playerId === state.meId;
                    const conf = s.confirmedBy.includes(state.meId), disp = s.disputedBy.includes(state.meId);
                    return (
                      <tr key={s.playerId} className={`border-t border-paper-line ${isMe ? "bg-ball/[.05]" : ""}`}>
                        <td className="px-5 py-2.5"><div className="flex items-center gap-2"><Avatar config={p.character} size={26} /><span className="font-semibold">{p.nickname}{isMe && " (you)"}</span>{s.revised && <span className="rounded bg-sky-soft px-1 text-[10px] font-bold text-[#1d6f96]">revised</span>}</div></td>
                        {(["pts", "ast", "reb", "stl", "blk", "tov"] as const).map((k) => <td key={k} className={`num px-2 py-2.5 text-right ${k === "pts" ? "font-bold" : ""}`}>{s.line[k]}</td>)}
                        <td className="px-5 py-2.5 text-right">
                          {isMe ? <StatBadge v={myV} /> : (
                            <div className="flex justify-end gap-1">
                              <button aria-pressed={conf} className={`rounded-full px-2.5 py-1 text-xs font-bold ${conf ? "bg-emerald text-white" : "bg-ink/5 hover:bg-emerald-soft"}`} onClick={() => dispatch({ type: "confirmSub", runId: run.id, playerId: s.playerId, by: state.meId })}>{conf ? "Confirmed" : "Confirm"}</button>
                              <button aria-pressed={disp} className={`rounded-full px-2.5 py-1 text-xs font-bold ${disp ? "bg-[#b4441a] text-white" : "bg-ink/5 hover:bg-[#f6d7c9]"}`} onClick={() => dispatch({ type: "disputeSub", runId: run.id, playerId: s.playerId, by: state.meId })}>{disp ? "Disputed" : "Dispute"}</button>
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
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper-line p-5">
          <div className="text-sm text-ink-2">You&apos;ve reviewed <b className="num text-ink">{reviewed}/{toConfirm.length}</b> other lines.
            {myV === "self" && <span className="block text-xs text-ink-3">Ask the others to confirm yours.</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {myV !== "opponent" && (
              <button className="btn-line" disabled={issues.length > 0 || requesting} title={issues.length ? "Resolve the mismatch first" : undefined} onClick={requestConfirmations}>
                {requesting ? "Players confirming…" : "Request confirmations"} <DemoTag>sim</DemoTag>
              </button>
            )}
            <button className="btn-ball" disabled={issues.length > 0} onClick={() => { dispatch({ type: "finishReview", runId: run.id }); router.push(`/runs/${run.id}/reflect`); }}>
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
    <div className="panel p-6">
      <div className="eyebrow">Saved to My Game</div>
      <div className="display mt-1 text-[2.4rem]">{rec?.result === "W" ? "Dub." : "Run it back."} <span className="num text-ink-2">{rec?.score}</span></div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        {rec && <StatBadge v={rec.verification} />}
        {rec?.mmrDelta !== undefined && <span className={`num font-bold ${rec.mmrDelta >= 0 ? "text-emerald" : "text-[#b4441a]"}`}>{rec.mmrDelta >= 0 ? "+" : ""}{rec.mmrDelta} MMR</span>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {!reflected && <Link href={`/runs/${run.id}/reflect`} className="btn-ball">How did you get your points?</Link>}
        <Link href="/my-game" className="btn-line">Open My Game</Link>
      </div>
    </div>
  );
}

function RosterPanel({ run }: { run: Run }) {
  const { state, player } = useStore();
  const empty = run.capacity - run.participants.length;
  return (
    <div>
      <div className="eyebrow mb-2">Roster · {run.participants.length}/{run.capacity}</div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {run.participants.map((id) => {
          const p = player(id)!;
          const here = run.checkedIn.includes(id);
          return (
            <li key={id} className="rise flex items-center gap-3 rounded-xl border border-paper-line bg-white/60 px-3 py-2.5">
              <Avatar config={p.character} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.nickname}{id === state.meId && " (you)"}{id === run.hostId && <span className="ml-1.5 text-[10px] font-bold uppercase text-ball">host</span>}</div>
                <div className="truncate text-xs text-ink-3">{archetypeName(p.dna, p.position)} · Trust {p.trust.attendance}%</div>
              </div>
              {here ? <span className="flex items-center gap-1 text-xs font-bold text-emerald"><I.Check width={14} height={14} />Here</span> : <span className="text-xs text-ink-3">Coming</span>}
            </li>
          );
        })}
        {Array.from({ length: empty }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border border-dashed border-ink/20 px-3 py-2.5 text-sm text-ink-3">
            <span className="h-9 w-9 rounded-full border-2 border-dashed border-ink/20" /> Open spot
          </li>
        ))}
      </ul>
    </div>
  );
}
