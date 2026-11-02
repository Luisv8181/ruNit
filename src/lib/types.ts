// Core domain types. These mirror the Postgres schema in supabase/migrations.

export type Archetype = "slasher" | "shooter" | "defender" | "playmaker" | "post";

export type CourtVerification =
  | "imported"
  | "community_submitted"
  | "community_verified"
  | "officially_verified";

export interface Court {
  id: string;
  name: string;
  city: "Hazleton" | "Scranton" | "West Hazleton" | "Dunmore";
  neighborhood: string;
  address?: string;
  lat: number;
  lng: number;
  indoor: boolean;
  lights: boolean;
  surface: "Asphalt" | "Concrete" | "Sport tile" | "Hardwood";
  access: "public" | "membership" | "school_hours";
  accessible: boolean;
  hoops: number;
  amenities: string[];
  verification: CourtVerification;
  confirmations: number;
  note: string;
  hue: "sun" | "emerald" | "sky" | "ball";
}

export type GameFormat = "1v1" | "2v2" | "3v3" | "5v5";
export type RunStatus = "open" | "full" | "checkin" | "live" | "final" | "reviewed";

export interface StatLine {
  pts: number;
  ast: number;
  reb: number;
  stl: number;
  blk: number;
  tov: number;
}

export type Verification = "self" | "participant" | "opponent" | "video";

export interface StatSubmission {
  playerId: string;
  line: StatLine;
  submittedAt: string;
  confirmedBy: string[]; // player ids who confirmed
  disputedBy: string[];
  revised?: boolean;
}

export interface Run {
  id: string;
  courtId: string;
  hostId: string;
  title: string;
  startsAt: string; // ISO
  format: GameFormat;
  target: 11 | 15 | 21;
  capacity: number;
  mode: "casual" | "ranked";
  visibility: "public" | "private";
  requirement?: string;
  participants: string[];
  checkedIn: string[];
  teams: { a: string[]; b: string[] } | null;
  status: RunStatus;
  code: string;
  score?: { a: number; b: number };
  submissions: StatSubmission[];
  recurring?: string;
  demoSeeded?: boolean;
}

export interface CharacterConfig {
  build: "lean" | "athletic" | "strong";
  skin: number; // index into palette
  hair: "fade" | "twists" | "buzz" | "bun" | "locs";
  jersey: { primary: string; secondary: string; number: string; cut: "tank" | "tee" };
  shoes: { color: string; height: "low" | "mid" };
  sleeve: "none" | "compression" | "flux";
  headband: boolean;
  tights: boolean;
  effects: Archetype[]; // 0-2, chosen from earned archetypes
}

export interface PlayerDNA {
  slasher: number;
  shooter: number;
  defender: number;
  playmaker: number;
  post: number;
}

export interface Player {
  id: string;
  name: string;
  nickname: string;
  city: string;
  position: "Guard" | "Wing" | "Forward" | "Big";
  heightIn: number;
  dna: PlayerDNA;
  mmr: number;
  trust: { attendance: number; sportsmanship: number; confirmedGames: number };
  availableNow: boolean;
  character: CharacterConfig;
  bio?: string;
}

export interface GameRecord {
  runId: string;
  date: string;
  courtId: string;
  format: GameFormat;
  mode: "casual" | "ranked";
  result: "W" | "L";
  score: string;
  line: StatLine;
  verification: Verification;
  mmrDelta?: number;
}

export type ScoringTag =
  | "Drives"
  | "Finishing through contact"
  | "Post moves"
  | "Mid-range"
  | "Three-pointers"
  | "Fast breaks"
  | "Free throws"
  | "Cuts"
  | "Putbacks";

export interface Reflection {
  runId: string;
  date: string;
  scoring: ScoringTag[];
  strongest?: string;
  difficult?: string;
  learned?: string;
  improve?: string;
}

export interface Squad {
  id: string;
  name: string;
  city: string;
  tagline: string;
  members: string[];
  record: { w: number; l: number };
  color: string;
  open: boolean;
  homeCourtId: string;
}

export type OpportunityType =
  | "Tournament"
  | "Camp"
  | "Showcase"
  | "Coaching"
  | "Refereeing"
  | "Training"
  | "Employment"
  | "Sponsorship"
  | "Community";

export interface Opportunity {
  id: string;
  title: string;
  org: string;
  type: OpportunityType;
  city: string;
  date: string;
  eligibility: "18+" | "All ages" | "Coaches & mentors (background check)" | "Teams of 3–4, 18+";
  cost: string;
  organizerVerified: boolean;
  summary: string;
  details: string[];
  spots?: number;
}

export interface Challenge {
  id: string;
  title: string;
  from: string; // squad id or player id
  to: string;
  courtId: string;
  when: string;
  format: GameFormat;
  status: "open" | "accepted";
}

export interface ActivityItem {
  id: string;
  at: string;
  text: string;
  kind: "run" | "court" | "squad" | "achievement" | "opportunity";
}

export interface Notice {
  id: string;
  at: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
}

export interface CourtSubmission {
  id: string;
  kind: "new_court" | "correction";
  courtId?: string;
  name?: string;
  city?: string;
  details: string;
  at: string;
  status: "pending_review";
}
