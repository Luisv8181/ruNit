// Backend mode detection. RUN IT never pretends a backend call succeeded.
// With no Supabase credentials the app runs in DEMO MODE: all data is local and fictional.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "";

export const backendMode: "demo" | "supabase" = SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : "demo";

/**
 * Contract a live adapter must satisfy. The demo store (store.tsx) implements these as local
 * reducer actions; the Supabase adapter is NOT implemented yet — see docs/ROADMAP.md.
 */
export interface RunitBackend {
  createRun(input: unknown): Promise<{ id: string }>;
  joinRun(runId: string): Promise<void>;
  checkIn(runId: string, code: string): Promise<void>;
  submitStats(runId: string, line: unknown): Promise<void>;
  confirmStats(runId: string, playerId: string): Promise<void>;
  submitReflection(runId: string, reflection: unknown): Promise<void>;
}

export class NotConfiguredError extends Error {
  constructor() {
    super("Live backend not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
}
