"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Archetype, CharacterConfig } from "@/lib/types";
import { ARCH, ARCH_ORDER, earnedArchetypes } from "@/lib/archetypes";
import { PlayerFigure, SKIN } from "@/components/PlayerFigure";
import { BackLink, CourtArt } from "@/components/ui";
import { I } from "@/components/icons";

const COLORS = ["#F47B35", "#F4C65E", "#239B72", "#56B8E8", "#8A6BE0", "#202B30", "#FFF9F0", "#C2363A", "#1F4E8C"];
const TABS = ["Jersey", "Look", "Gear", "Skill FX"] as const;

function Swatches({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <button key={c} role="radio" aria-checked={value === c} aria-label={c} onClick={() => onChange(c)} className={`h-10 w-10 rounded-full border border-ink/15 transition ${value === c ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""}`} style={{ background: c }} />
      ))}
    </div>
  );
}

function Opt<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => <button key={o.v} aria-pressed={value === o.v} className={`chip px-4 py-2 text-sm ${value === o.v ? "chip-on" : ""}`} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  );
}

export default function Customize() {
  const { me, dispatch } = useStore();
  const router = useRouter();
  const [cfg, setCfg] = useState<CharacterConfig>(me.character);
  const [nick, setNick] = useState(me.nickname);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Jersey");
  const [err, setErr] = useState<string | null>(null);
  const earned = earnedArchetypes(me.dna);
  const up = (p: Partial<CharacterConfig>) => setCfg((c) => ({ ...c, ...p }));
  const jersey = (p: Partial<CharacterConfig["jersey"]>) => setCfg((c) => ({ ...c, jersey: { ...c.jersey, ...p } }));
  const shoes = (p: Partial<CharacterConfig["shoes"]>) => setCfg((c) => ({ ...c, shoes: { ...c.shoes, ...p } }));
  const toggleFx = (a: Archetype) => setCfg((c) => ({ ...c, effects: c.effects.includes(a) ? c.effects.filter((x) => x !== a) : [...c.effects, a].slice(-2) }));

  const save = () => {
    if (!/^[A-Za-z0-9\-' .]{2,14}$/.test(nick.trim())) return setErr("Nickname: 2–14 letters, numbers, spaces, - or '.");
    if (!/^\d{1,2}$/.test(cfg.jersey.number)) return setErr("Jersey number must be 0–99.");
    if (cfg.jersey.primary === cfg.jersey.secondary) return setErr("Pick two different jersey colors so your number is readable.");
    dispatch({ type: "character", config: cfg, nickname: nick.trim() });
    router.push("/my-game");
  };

  return (
    <div>
      <BackLink href="/my-game" label="My Game" />
      <div className="grid gap-8 lg:grid-cols-[1fr_440px]">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#FFE9C9] to-[#F7C590] lg:sticky lg:top-24 lg:h-[640px]">
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(180deg,transparent,rgba(122,61,18,.12))]" />
          <CourtArt className="absolute inset-x-0 bottom-[-160px] mx-auto h-[420px] [transform:perspective(600px)_rotateX(55deg)]" stroke="#7a3d12" opacity={0.25} />
          <div className="relative flex h-full flex-col items-center justify-end px-4 pb-6 pt-10">
            <PlayerFigure config={cfg} size={300} idSuffix="edit" />
            <div className="display mt-2 text-[3rem] text-ink">{nick || "—"}</div>
            <div className="text-xs font-semibold tracking-[.2em] text-ink/50">{cfg.effects.length ? cfg.effects.map((e) => ARCH[e].effect).join(" + ") : "No skill effect"}</div>
          </div>
        </div>

        <div>
          <div className="eyebrow">Character</div>
          <h1 className="display mt-1 text-[3rem]">Build your look</h1>
          <p className="mt-1 text-sm text-ink-2">Cosmetic only. Nothing here changes ratings, matchmaking or what others see about your stats.</p>

          <div className="mt-5"><label className="label" htmlFor="nick">Nickname</label><input id="nick" className="field font-semibold" value={nick} onChange={(e) => setNick(e.target.value)} maxLength={14} /></div>

          <div className="mt-6 flex gap-1 rounded-2xl bg-ink/[.05] p-1" role="tablist">
            {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={`flex-1 rounded-xl py-2 text-sm font-bold ${tab === t ? "bg-ink text-paper" : "text-ink-2"}`} onClick={() => setTab(t)}>{t}</button>)}
          </div>

          <div className="mt-6 space-y-6">
            {tab === "Jersey" && (<>
              <div><span className="label">Primary</span><Swatches label="Primary color" value={cfg.jersey.primary} onChange={(c) => jersey({ primary: c })} /></div>
              <div><span className="label">Trim & number</span><Swatches label="Secondary color" value={cfg.jersey.secondary} onChange={(c) => jersey({ secondary: c })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label" htmlFor="num">Number</label><input id="num" inputMode="numeric" className="field num text-xl font-bold" value={cfg.jersey.number} onChange={(e) => jersey({ number: e.target.value.replace(/\D/g, "").slice(0, 2) })} /></div>
                <div><span className="label">Cut</span><Opt value={cfg.jersey.cut} onChange={(v) => jersey({ cut: v })} options={[{ v: "tank", label: "Tank" }, { v: "tee", label: "Tee" }]} /></div>
              </div>
            </>)}
            {tab === "Look" && (<>
              <div><span className="label">Build</span><Opt value={cfg.build} onChange={(v) => up({ build: v })} options={[{ v: "lean", label: "Lean" }, { v: "athletic", label: "Athletic" }, { v: "strong", label: "Strong" }]} /></div>
              <div><span className="label">Skin tone</span>
                <div className="flex gap-2">{SKIN.map((s, i) => <button key={s} aria-label={`Skin tone ${i + 1}`} aria-pressed={cfg.skin === i} onClick={() => up({ skin: i })} className={`h-10 w-10 rounded-full border border-ink/10 ${cfg.skin === i ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""}`} style={{ background: s }} />)}</div>
              </div>
              <div><span className="label">Hair</span><Opt value={cfg.hair} onChange={(v) => up({ hair: v })} options={[{ v: "fade", label: "Fade" }, { v: "buzz", label: "Buzz" }, { v: "twists", label: "Twists" }, { v: "locs", label: "Locs" }, { v: "bun", label: "Bun" }]} /></div>
            </>)}
            {tab === "Gear" && (<>
              <div><span className="label">Shoes</span><Swatches label="Shoe color" value={cfg.shoes.color} onChange={(c) => shoes({ color: c })} /><div className="mt-3"><Opt value={cfg.shoes.height} onChange={(v) => shoes({ height: v })} options={[{ v: "low", label: "Low" }, { v: "mid", label: "Mid" }]} /></div></div>
              <div><span className="label">Arm sleeve</span><Opt value={cfg.sleeve} onChange={(v) => up({ sleeve: v })} options={[{ v: "none", label: "None" }, { v: "compression", label: "Compression" }, { v: "flux", label: "Flux sleeve ✦" }]} />
                {cfg.sleeve === "flux" && <p className="mt-2 text-xs text-ink-3">Flux seams glow in the color of your primary skill effect.</p>}</div>
              <div className="flex flex-wrap gap-2">
                <button aria-pressed={cfg.headband} className={`chip px-4 py-2 text-sm ${cfg.headband ? "chip-on" : ""}`} onClick={() => up({ headband: !cfg.headband })}>Headband</button>
                <button aria-pressed={cfg.tights} className={`chip px-4 py-2 text-sm ${cfg.tights ? "chip-on" : ""}`} onClick={() => up({ tights: !cfg.tights })}>Compression tights</button>
              </div>
            </>)}
            {tab === "Skill FX" && (
              <div>
                <p className="mb-3 text-sm text-ink-2">Effects represent how you actually play. You unlock one when it shows up in your Player DNA. Equip up to two.</p>
                <ul className="space-y-2">
                  {ARCH_ORDER.map((a) => {
                    const unlocked = earned.includes(a);
                    const on = cfg.effects.includes(a);
                    return (
                      <li key={a}>
                        <button disabled={!unlocked} aria-pressed={on} onClick={() => toggleFx(a)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${on ? "border-ink bg-white" : "border-paper-line bg-white/50"} ${!unlocked ? "cursor-not-allowed opacity-50" : "hover:border-ink/40"}`}>
                          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: ARCH[a].soft, color: ARCH[a].color }}><I.Bolt /></span>
                          <span className="flex-1">
                            <span className="block font-bold">{ARCH[a].label}, <span className="font-medium text-ink-2">{ARCH[a].effect}</span></span>
                            <span className="block text-xs text-ink-3">{unlocked ? ARCH[a].read : `Locked, DNA ${me.dna[a]} — becomes available when it's one of your defining traits`}</span>
                          </span>
                          {on && <I.Check className="text-emerald" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {err && <p className="mt-5 text-sm font-semibold text-[#b4441a]" role="alert">{err}</p>}
          <div className="mt-8 flex gap-2">
            <button className="btn-line flex-1" onClick={() => { setCfg(me.character); setNick(me.nickname); setErr(null); }}>Revert</button>
            <button className="btn-ball flex-1" onClick={save}>Save look</button>
          </div>
        </div>
      </div>
    </div>
  );
}
