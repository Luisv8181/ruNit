"use client";

// The Card look's signature: your player card, foil-edged only because every stat on it was confirmed by the other team.
import Link from "next/link";
import { useStore } from "@/lib/store";
import { archetypeName } from "@/lib/archetypes";

export function PlayerCard() {
  const { state, me } = useStore();
  const confirmed = state.history.filter((h) => h.verification === "opponent" || h.verification === "video");
  const w = confirmed.filter((h) => h.result === "W").length;
  const l = confirmed.length - w;
  const ppg = confirmed.length ? confirmed.reduce((n, h) => n + h.line.pts, 0) / confirmed.length : 0;
  return (
    <Link href="/my-game" aria-label="Your player card" className="foil block max-w-[520px] -rotate-1 rounded-[24px] p-1 shadow-[0_22px_36px_-22px_rgba(21,33,59,.7)] transition-transform hover:rotate-0">
      <div className="scope-night grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 rounded-[20px] bg-ink px-5 py-4 text-paper">
        <div className="display row-span-2 text-[112px] leading-[0.8] text-transparent [-webkit-text-stroke:2px_rgb(var(--c-chalk))]">{me.character.jersey.number}</div>
        <div className="min-w-0">
          <div className="display truncate text-[38px]">{me.nickname}</div>
          <div className="text-[15px] text-paper/70">{archetypeName(me.dna, me.position)}</div>
        </div>
        <dl className="flex gap-6">
          <div><dd className="num text-[28px] leading-none">{w}–{l}</dd><dt className="text-xs text-paper/70">confirmed record</dt></div>
          <div><dd className="num text-[28px] leading-none">{ppg.toFixed(1)}</dd><dt className="text-xs text-paper/70">points a game</dt></div>
        </dl>
        <div className="col-span-2 flex items-center justify-between border-t border-paper/15 pt-3">
          <span className="text-[13px] text-paper/70">Card {confirmed.length} of your season</span>
          <span className="foil rounded-full px-2.5 py-0.5 text-xs font-bold text-[#15213B]">Verified</span>
        </div>
      </div>
    </Link>
  );
}
