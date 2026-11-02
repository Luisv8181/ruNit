import Link from "next/link";
import type { CourtVerification, PlayerDNA, Verification } from "@/lib/types";
import { ARCH, ARCH_ORDER } from "@/lib/archetypes";
import { I } from "./icons";

export function Logo({ size = 36, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="RUN IT">
      <NetMark size={size} />
      <span className={`display text-[1.75em] leading-none tracking-wide ${light ? "text-paper" : "text-ink"}`}>
        RUN IT
      </span>
    </span>
  );
}

// A hoop whose net is a network: every knot is a player, the lit one is you.
export const NET_EDGES = "M5 10.2L7.9 17M10.5 11.7L7.9 17M10.5 11.7L13.2 17M16 12L13.2 17M16 12L18.8 17M21.5 11.7L18.8 17M21.5 11.7L24.1 17M27 10.2L24.1 17M7.9 17L10.8 22M13.2 17L10.8 22M13.2 17L16 22M18.8 17L16 22M18.8 17L21.2 22M24.1 17L21.2 22M10.8 22L13.4 26.5M16 22L13.4 26.5M16 22L18.6 26.5M21.2 22L18.6 26.5M13.4 26.5L16 30M18.6 26.5L16 30";
export const NET_NODES: [number, number][] = [[5, 10.2], [10.5, 11.7], [16, 12], [21.5, 11.7], [27, 10.2], [7.9, 17], [13.2, 17], [18.8, 17], [24.1, 17], [10.8, 22], [21.2, 22], [13.4, 26.5], [18.6, 26.5], [16, 30]];

export function NetMark({ size = 26 }: { size?: number }) {
  const ball = "rgb(var(--c-ball))";
  return (
    <svg width={size * 1.15} height={size} viewBox="0 4 32 28" aria-hidden>
      <ellipse cx="16" cy="9" rx="12" ry="3" fill="none" stroke={ball} strokeWidth="2" />
      <path d={NET_EDGES} stroke={ball} strokeWidth=".9" strokeLinecap="round" fill="none" opacity=".85" />
      {NET_NODES.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.25" fill={ball} />)}
      <circle cx="16" cy="22" r="2.4" stroke={ball} strokeWidth="1.2" style={{ fill: "rgb(var(--c-ink))" }} />
    </svg>
  );
}

/** Half-court line drawing. Used where the content is literally about a court. */
export function CourtArt(_props: { className?: string; stroke?: string; opacity?: number }) {
  // Retired: decorative court drawings behind text. The court now appears only as CourtRun, where it carries data.
  return null;
}

export function SectionHead({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h2 className="display text-[2rem] sm:text-[2.4rem]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

const COURT_V: Record<CourtVerification, { label: string; cls: string; tip: string }> = {
  imported: { label: "Imported", cls: "bg-ink/5 text-ink-2 border-ink/10", tip: "From open map data. Not yet confirmed by players." },
  community_submitted: { label: "Submitted", cls: "bg-sun-soft text-sun-deep border-sun/50", tip: "Added by a player. Needs 5 confirmations." },
  community_verified: { label: "Community verified", cls: "seal-verified bg-emerald-soft text-emerald border-emerald/30", tip: "Confirmed by 5+ players who played here." },
  officially_verified: { label: "Official", cls: "seal-verified bg-sky-soft text-sky-deep border-sky/40", tip: "Confirmed by the facility operator." },
};
export function CourtBadge({ v }: { v: CourtVerification }) {
  const x = COURT_V[v];
  return <span title={x.tip} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${x.cls}`}>{v === "officially_verified" || v === "community_verified" ? <I.Check width={12} height={12} /> : null}{x.label}</span>;
}
export const courtVerificationTip = (v: CourtVerification) => COURT_V[v].tip;

const STAT_V: Record<Verification, { label: string; cls: string; step: number }> = {
  self: { label: "Self-reported", cls: "text-ink-2 bg-ink/5", step: 1 },
  participant: { label: "Teammate-confirmed", cls: "text-sun-deep bg-sun-soft", step: 2 },
  opponent: { label: "Opponent-confirmed", cls: "seal-verified text-emerald bg-emerald-soft", step: 3 },
  video: { label: "Video-supported", cls: "seal-verified text-sky-deep bg-sky-soft", step: 4 },
};
export function StatBadge({ v }: { v: Verification }) {
  const x = STAT_V[v];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${x.cls}`}>
      <span className="flex gap-[2px]">{[1, 2, 3, 4].map((i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= x.step ? "bg-current" : "bg-current opacity-20"}`} />)}</span>
      {x.label}
    </span>
  );
}

export function DNABars({ dna, compact = false, dark = false }: { dna: PlayerDNA; compact?: boolean; dark?: boolean }) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-3"}>
      {ARCH_ORDER.map((k) => (
        <div key={k} className="grid grid-cols-[86px_1fr_32px] items-center gap-3">
          <span className={`text-xs font-semibold ${dark ? "text-paper/80" : "text-ink-2"}`}>{ARCH[k].label}</span>
          <div className={`h-2 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-ink/[.06]"}`}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${dna[k]}%`, background: ARCH[k].color }} />
          </div>
          <span className={`num text-right text-xs ${dark ? "text-paper" : "text-ink"}`}>{dna[k]}</span>
        </div>
      ))}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 px-6 py-10 text-center">
      <div className="display text-2xl">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-ink">
      <I.Back width={16} height={16} /> {label}
    </Link>
  );
}

export function DemoTag({ children = "Demo" }: { children?: React.ReactNode }) {
  return <span className="rounded border border-dashed border-ink/30 px-1.5 py-px text-[10px] font-bold text-ink-3">{children}</span>;
}
