// Provider-independent development-insight service.
// The demo ships a deterministic rule-based provider. An LLM provider can implement the same
// interface later, but must return structured output that cites the evidence it used.

import type { GameRecord, Reflection, ScoringTag } from "./types";

export interface Insight {
  id: string;
  headline: string;
  body: string;
  evidence: string; // what data this is based on — always shown
  confidence: "Early signal" | "Emerging pattern" | "Consistent pattern";
  suggestion?: string;
}

export interface InsightProvider {
  name: string;
  generate(input: { history: GameRecord[]; reflections: Reflection[] }): Insight[];
}

const DRIVE_TAGS: ScoringTag[] = ["Drives", "Finishing through contact", "Cuts", "Fast breaks"];

export const ruleBasedProvider: InsightProvider = {
  name: "rules-v1",
  generate({ history, reflections }) {
    const out: Insight[] = [];
    const recent = [...reflections].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 5);
    const n = recent.length;

    if (n === 0) {
      return [{ id: "none", headline: "Not enough to say yet", body: "Finish a game and answer one reflection question. Patterns show up after three or four games.", evidence: "0 reflections", confidence: "Early signal" }];
    }

    const attack = recent.filter((r) => r.scoring.some((t) => DRIVE_TAGS.includes(t))).length;
    if (attack >= 2) {
      const contact = recent.filter((r) => r.scoring.includes("Finishing through contact")).length;
      out.push({
        id: "attack",
        headline: "You score best attacking the basket",
        body: `In ${attack} of your last ${n} reflected games, most of your points came going to the rim${contact >= 2 ? `, and finishing through contact came up ${contact} times` : ""}.`,
        evidence: `Your reflections from the last ${n} games (self-reported)`,
        confidence: attack >= 4 ? "Consistent pattern" : attack >= 3 ? "Emerging pattern" : "Early signal",
        suggestion: recent.some((r) => /left|weak/i.test(`${r.difficult ?? ""} ${r.improve ?? ""}`))
          ? "You've mentioned your weak hand more than once. Want a 10-minute weak-hand finishing routine?"
          : undefined,
      });
    }

    const settled = recent.find((r) => r.scoring.length === 1 && r.scoring[0] === "Three-pointers");
    if (settled) {
      const lost = history.find((g) => g.runId === settled.runId)?.result === "L";
      out.push({
        id: "settle",
        headline: "When the defense sags, you've settled",
        body: `In one game you scored only from three${lost ? " and lost" : ""}. Your own note: "${settled.difficult ?? settled.learned ?? ""}"`,
        evidence: "1 game — too few to call it a habit",
        confidence: "Early signal",
      });
    }

    const last = [...history].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 5);
    if (last.length >= 3) {
      const tov = last.reduce((s, g) => s + g.line.tov, 0) / last.length;
      const tovL = last.filter((g) => g.result === "L");
      const tovLossAvg = tovL.length ? tovL.reduce((s, g) => s + g.line.tov, 0) / tovL.length : 0;
      if (tovL.length && tovLossAvg > tov + 0.5) {
        out.push({
          id: "tov",
          headline: "Turnovers track your losses",
          body: `You average ${tov.toFixed(1)} turnovers a game, but ${tovLossAvg.toFixed(1)} in losses.`,
          evidence: `Box scores from your last ${last.length} games (mix of self-reported and confirmed)`,
          confidence: "Emerging pattern",
        });
      }
    }
    return out;
  },
};
