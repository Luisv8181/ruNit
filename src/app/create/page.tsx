"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import type { GameFormat } from "@/lib/types";
import { DEMO_HOME, distLabel, miles } from "@/lib/util";
import { CourtArt } from "@/components/ui";
import { I } from "@/components/icons";

const FORMATS: { f: GameFormat; size: number }[] = [
  { f: "1v1", size: 2 }, { f: "2v2", size: 4 }, { f: "3v3", size: 6 }, { f: "5v5", size: 10 },
];

function defaultStart() {
  const d = new Date(Date.now() + 75 * 60e3);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}
const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function CreatePage() {
  return <Suspense><Create /></Suspense>;
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-ink/[.05] p-1">
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={value === o.v} key={String(o.v)} onClick={() => onChange(o.v)}
          className={`rounded-xl py-2.5 text-sm font-bold transition ${value === o.v ? "bg-ink text-paper shadow" : "text-ink-2 hover:text-ink"}`}>{o.label}</button>
      ))}
    </div>
  );
}

function Create() {
  const { state, me, createRun, court } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const sortedCourts = useMemo(() => [...state.courts].sort((a, b) => miles(DEMO_HOME, a) - miles(DEMO_HOME, b)), [state.courts]);
  const start = defaultStart();
  const [courtId, setCourtId] = useState(params.get("court") ?? sortedCourts[0].id);
  const [date, setDate] = useState(toDateInput(start));
  const [time, setTime] = useState(toTimeInput(start));
  const [format, setFormat] = useState<GameFormat>("3v3");
  const [target, setTarget] = useState<11 | 15 | 21>(21);
  const [extra, setExtra] = useState(0);
  const [mode, setMode] = useState<"casual" | "ranked">("casual");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [requirement, setRequirement] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const size = FORMATS.find((x) => x.f === format)!.size;
  const capacity = size + extra;
  const c = court(courtId)!;
  const title = `${me.nickname}'s ${format === "1v1" ? "1v1" : format.slice(0, 1) + "s"} at ${c.name.split(" ")[0]}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const when = new Date(`${date}T${time}`);
    if (isNaN(+when)) errs.when = "Pick a date and time.";
    else if (+when < Date.now() - 5 * 60e3) errs.when = "That time has already passed.";
    else if (+when > Date.now() + 60 * 86400e3) errs.when = "Runs can be scheduled up to 60 days out.";
    if (mode === "ranked" && extra > 0) errs.mode = "Ranked games need exact teams — remove the extra spots or switch to casual.";
    if (requirement.length > 120) errs.req = "Keep it under 120 characters.";
    if (c.access === "membership" && !requirement.toLowerCase().includes("pass")) {
      // not an error — a nudge handled in UI
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    // Small delay mirrors a real network write so the loading state is visible.
    setTimeout(() => {
      const id = createRun({
        courtId, startsAt: when.toISOString(), format, target, capacity, mode, visibility, title,
        requirement: requirement.trim() || undefined,
        recurring: recurring ? `Weekly · ${when.toLocaleDateString([], { weekday: "long" })}s ${when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : undefined,
      });
      router.push(`/runs/${id}?new=1`);
    }, 450);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative mb-6 overflow-hidden">
        <div className="eyebrow mb-1">Create a run</div>
        <h1 className="display text-[3.2rem] sm:text-[4.2rem]">Call your run</h1>
        <p className="mt-2 text-ink-2">Defaults are set to the closest court and the next open slot. Change what you need and go.</p>
      </div>

      <form onSubmit={submit} className="space-y-7" noValidate>
        <section>
          <label className="label" htmlFor="court">Court</label>
          <div className="relative">
            <select id="court" className="field appearance-none pr-10 font-semibold" value={courtId} onChange={(e) => setCourtId(e.target.value)}>
              {sortedCourts.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.city} · {distLabel(x)}</option>)}
            </select>
            <I.Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-ink-3" />
          </div>
          <p className="mt-1.5 text-xs text-ink-3">{c.indoor ? "Indoor" : "Outdoor"} · {c.surface} · {c.lights ? "lights" : "no lights — plan for daylight"}{c.access === "membership" ? " · day pass required" : ""}</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="date">Date</label><input id="date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="label" htmlFor="time">Tip-off</label><input id="time" type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          {errors.when && <p className="col-span-2 text-sm font-semibold text-[#b4441a]" role="alert">{errors.when}</p>}
        </section>

        <section>
          <span className="label">Format</span>
          <Seg label="Format" value={format} onChange={(v) => { setFormat(v); setExtra(0); }} options={FORMATS.map((x) => ({ v: x.f, label: x.f }))} />
        </section>

        <section>
          <span className="label">Game to</span>
          <Seg label="Target score" value={target} onChange={setTarget} options={[11, 15, 21].map((v) => ({ v: v as 11 | 15 | 21, label: `First to ${v}` }))} />
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <span className="label">Players</span>
            <div className="flex items-center gap-3 rounded-2xl bg-ink/[.05] p-1.5">
              <button type="button" aria-label="Fewer waiting spots" className="grid h-10 w-10 place-items-center rounded-xl bg-paper font-bold disabled:opacity-30" disabled={extra === 0} onClick={() => setExtra((x) => Math.max(0, x - 1))}>−</button>
              <div className="flex-1 text-center"><span className="num text-2xl font-bold">{capacity}</span><span className="ml-1 text-xs text-ink-3">{extra ? `incl. ${extra} next` : "exact"}</span></div>
              <button type="button" aria-label="More waiting spots" className="grid h-10 w-10 place-items-center rounded-xl bg-paper font-bold disabled:opacity-30" disabled={extra >= size} onClick={() => setExtra((x) => x + 1)}>+</button>
            </div>
            <p className="mt-1.5 text-xs text-ink-3">Extra spots are for “got next.”</p>
          </div>
          <div>
            <span className="label">Type</span>
            <Seg label="Game type" value={mode} onChange={setMode} options={[{ v: "casual", label: "Casual" }, { v: "ranked", label: "Ranked" }]} />
            <p className="mt-1.5 text-xs text-ink-3">{mode === "ranked" ? "Counts toward MMR. Stats need confirmation from players in the game." : "Just hoop. Stats still build your Player DNA."}</p>
            {errors.mode && <p className="mt-1 text-sm font-semibold text-[#b4441a]" role="alert">{errors.mode}</p>}
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <span className="label">Who can join</span>
            <Seg label="Visibility" value={visibility} onChange={setVisibility} options={[{ v: "public", label: "Anyone nearby" }, { v: "private", label: "Invite only" }]} />
          </div>
          <div>
            <span className="label">Repeat</span>
            <button type="button" aria-pressed={recurring} onClick={() => setRecurring((r) => !r)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold ${recurring ? "border-ball bg-ball/10 text-ink" : "border-ink/15 text-ink-2"}`}>
              Same time every week <span className={`h-5 w-9 rounded-full p-0.5 transition ${recurring ? "bg-ball" : "bg-ink/20"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${recurring ? "translate-x-4" : ""}`} /></span>
            </button>
          </div>
        </section>

        <section>
          <label className="label" htmlFor="req">House rules <span className="normal-case tracking-normal text-ink-3">(optional)</span></label>
          <input id="req" className="field" value={requirement} onChange={(e) => setRequirement(e.target.value)} placeholder={c.access === "membership" ? "Day pass at the front desk." : "Call your own fouls. Winners stay."} maxLength={140} />
          {errors.req && <p className="mt-1 text-sm font-semibold text-[#b4441a]">{errors.req}</p>}
        </section>

        <div className="relative overflow-hidden rounded-2xl bg-ink p-5 text-paper">
          <CourtArt className="absolute -right-8 -top-8 h-48" stroke="#fff" opacity={0.12} />
          <div className="eyebrow !text-sun">Preview</div>
          <div className="display mt-1 text-[1.9rem]">{title}</div>
          <div className="mt-1 text-sm text-paper/75">{format} · first to {target} · {capacity} players · {mode} · {visibility === "public" ? "open to nearby players" : "invite only"}</div>
          <button className="btn-ball mt-4 w-full py-3 text-base" disabled={saving}>{saving ? "Calling your run…" : "Call it"}</button>
        </div>
      </form>
    </div>
  );
}
