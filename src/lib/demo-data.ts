// DEMONSTRATION DATA — every person, court, squad, game and opportunity below is fictional.
// Coordinates are approximate placements around Hazleton and Scranton, PA for the demo map only.

import { myCourtGames, seedCourtGames } from "./records";
import type {
  ActivityItem, Challenge, CharacterConfig, Court, GameRecord, Opportunity,
  Player, Reflection, Run, Squad,
} from "./types";

export const ME = "p-jaylen";

const h = (hoursFromNow: number, minute = 0) => {
  const d = new Date();
  d.setMinutes(minute, 0, 0);
  d.setHours(d.getHours() + hoursFromNow);
  return d.toISOString();
};
const daysAgo = (n: number, hour = 18) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const daysAhead = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const courts: Court[] = [
  { id: "c-northside", name: "Northside Commons", city: "Hazleton", neighborhood: "North End", lat: 40.9662, lng: -75.9781, indoor: false, lights: true, surface: "Asphalt", access: "public", accessible: true, hoops: 4, amenities: ["Lights until 10pm", "Water fountain", "Benches", "Bike rack"], verification: "community_verified", confirmations: 23, note: "Double rims on the east side. Best run is weekday evenings.", hue: "sun" },
  { id: "c-hilltop", name: "Hilltop Rec Center", city: "Hazleton", neighborhood: "Heights", lat: 40.9531, lng: -75.9632, indoor: true, lights: true, surface: "Hardwood", access: "membership", accessible: true, hoops: 6, amenities: ["Locker rooms", "Day pass $5", "Scoreboard", "Restrooms"], verification: "officially_verified", confirmations: 41, note: "Open gym Tue/Thu 6–9pm. Day pass at the front desk.", hue: "sky" },
  { id: "c-laurel", name: "Laurel Run Courts", city: "Hazleton", neighborhood: "South Side", lat: 40.9452, lng: -75.9798, indoor: false, lights: false, surface: "Concrete", access: "public", accessible: false, hoops: 2, amenities: ["Shade trees", "Picnic tables"], verification: "community_submitted", confirmations: 3, note: "Net on the south rim is torn — reported by a community member.", hue: "emerald" },
  { id: "c-elmyard", name: "Elm Yard Half-Court", city: "West Hazleton", neighborhood: "West End", lat: 40.9601, lng: -76.0054, indoor: false, lights: true, surface: "Sport tile", access: "public", accessible: true, hoops: 1, amenities: ["New tile surface", "Lights", "Mural wall"], verification: "community_verified", confirmations: 12, note: "One hoop, great for 1v1 and 2v2. Mural wall is a favorite photo spot.", hue: "ball" },
  { id: "c-schoolyard", name: "Cedar Street Schoolyard", city: "Hazleton", neighborhood: "Downtown", lat: 40.9575, lng: -75.9725, indoor: false, lights: false, surface: "Asphalt", access: "school_hours", accessible: true, hoops: 4, amenities: ["Open after 4pm & weekends"], verification: "imported", confirmations: 0, note: "Imported from open map data. Hours not yet confirmed by the community.", hue: "sun" },
  { id: "c-riverside", name: "Riverside Steps", city: "Scranton", neighborhood: "South Side", lat: 41.4005, lng: -75.6652, indoor: false, lights: true, surface: "Asphalt", access: "public", accessible: true, hoops: 4, amenities: ["Lights", "Bleacher steps", "Water fountain"], verification: "community_verified", confirmations: 31, note: "Saturday morning run is the most competitive in the area.", hue: "sky" },
  { id: "c-electric", name: "Electric City Rec", city: "Scranton", neighborhood: "Downtown", lat: 41.4101, lng: -75.6624, indoor: true, lights: true, surface: "Hardwood", access: "membership", accessible: true, hoops: 8, amenities: ["Two full courts", "Locker rooms", "Day pass $7", "Scoreboards"], verification: "officially_verified", confirmations: 52, note: "League nights Wednesday. Open run Sat/Sun afternoons.", hue: "ball" },
  { id: "c-greenridge", name: "Green Ridge Park Courts", city: "Scranton", neighborhood: "Green Ridge", lat: 41.4268, lng: -75.6497, indoor: false, lights: false, surface: "Concrete", access: "public", accessible: true, hoops: 2, amenities: ["Park restrooms (seasonal)", "Shade"], verification: "community_submitted", confirmations: 4, note: "Submitted last month. Two more confirmations to verify.", hue: "emerald" },
  { id: "c-dunmore", name: "Dunmore Corners", city: "Dunmore", neighborhood: "Corners", lat: 41.4193, lng: -75.6326, indoor: false, lights: true, surface: "Asphalt", access: "public", accessible: false, hoops: 2, amenities: ["Lights", "Street parking"], verification: "imported", confirmations: 1, note: "Imported from open map data.", hue: "sun" },
];

const char = (c: Partial<CharacterConfig>): CharacterConfig => ({
  build: "athletic", skin: 2, hair: "fade",
  jersey: { primary: "#F47B35", secondary: "#FFF9F0", number: "0", cut: "tank" },
  shoes: { color: "#FFF9F0", height: "mid" },
  sleeve: "none", headband: false, tights: false, effects: [],
  ...c,
});

export const players: Player[] = [
  { id: ME, name: "Jaylen Cruz", nickname: "J-Rise", city: "Hazleton", position: "Wing", heightIn: 76, dna: { slasher: 82, shooter: 41, defender: 58, playmaker: 47, post: 36 }, mmr: 1418, trust: { attendance: 96, sportsmanship: 4.8, confirmedGames: 27 }, availableNow: true, bio: "Runs Northside on weeknights. Working on the left hand.",
    character: char({ skin: 3, hair: "twists", jersey: { primary: "#F47B35", secondary: "#202B30", number: "23", cut: "tank" }, shoes: { color: "#F4C65E", height: "mid" }, sleeve: "flux", effects: ["slasher"] }) },
  { id: "p-marcus", name: "Marcus Bell", nickname: "Big Bell", city: "Hazleton", position: "Big", heightIn: 80, dna: { slasher: 30, shooter: 22, defender: 74, playmaker: 35, post: 88 }, mmr: 1390, trust: { attendance: 91, sportsmanship: 4.6, confirmedGames: 33 }, availableNow: true,
    character: char({ build: "strong", skin: 4, hair: "buzz", jersey: { primary: "#239B72", secondary: "#FFF9F0", number: "44", cut: "tank" }, effects: ["post", "defender"] }) },
  { id: "p-yari", name: "Yaritza Peña", nickname: "Yari", city: "Hazleton", position: "Guard", heightIn: 66, dna: { slasher: 52, shooter: 86, defender: 49, playmaker: 71, post: 12 }, mmr: 1461, trust: { attendance: 98, sportsmanship: 4.9, confirmedGames: 40 }, availableNow: true,
    character: char({ build: "lean", skin: 2, hair: "bun", jersey: { primary: "#56B8E8", secondary: "#202B30", number: "3", cut: "tee" }, effects: ["shooter", "playmaker"] }) },
  { id: "p-deshawn", name: "DeShawn Ortiz", nickname: "Dash", city: "West Hazleton", position: "Guard", heightIn: 70, dna: { slasher: 77, shooter: 55, defender: 63, playmaker: 80, post: 18 }, mmr: 1502, trust: { attendance: 88, sportsmanship: 4.5, confirmedGames: 21 }, availableNow: false,
    character: char({ build: "lean", skin: 4, hair: "locs", jersey: { primary: "#202B30", secondary: "#F4C65E", number: "1", cut: "tank" }, effects: ["playmaker", "slasher"] }) },
  { id: "p-kev", name: "Kevin Rauch", nickname: "Kev", city: "Hazleton", position: "Forward", heightIn: 77, dna: { slasher: 40, shooter: 71, defender: 52, playmaker: 33, post: 58 }, mmr: 1334, trust: { attendance: 84, sportsmanship: 4.4, confirmedGames: 18 }, availableNow: true,
    character: char({ skin: 0, hair: "fade", jersey: { primary: "#F4C65E", secondary: "#202B30", number: "12", cut: "tee" }, effects: ["shooter"] }) },
  { id: "p-tasha", name: "Tasha Greene", nickname: "Lock", city: "Hazleton", position: "Wing", heightIn: 70, dna: { slasher: 45, shooter: 38, defender: 91, playmaker: 50, post: 30 }, mmr: 1447, trust: { attendance: 97, sportsmanship: 4.9, confirmedGames: 36 }, availableNow: false,
    character: char({ skin: 3, hair: "bun", jersey: { primary: "#239B72", secondary: "#FFF9F0", number: "5", cut: "tank" }, effects: ["defender"] }) },
  { id: "p-luisa", name: "Luisa Batista", nickname: "LB", city: "Hazleton", position: "Guard", heightIn: 64, dna: { slasher: 61, shooter: 64, defender: 55, playmaker: 84, post: 10 }, mmr: 1376, trust: { attendance: 93, sportsmanship: 4.8, confirmedGames: 25 }, availableNow: true,
    character: char({ build: "lean", skin: 1, hair: "twists", jersey: { primary: "#8A6BE0", secondary: "#FFF9F0", number: "8", cut: "tee" }, effects: ["playmaker"] }) },
  { id: "p-omar", name: "Omar Haddad", nickname: "O", city: "Scranton", position: "Forward", heightIn: 78, dna: { slasher: 66, shooter: 48, defender: 70, playmaker: 41, post: 63 }, mmr: 1489, trust: { attendance: 90, sportsmanship: 4.7, confirmedGames: 29 }, availableNow: true,
    character: char({ build: "strong", skin: 2, hair: "fade", jersey: { primary: "#202B30", secondary: "#F47B35", number: "21", cut: "tank" }, effects: ["defender", "slasher"] }) },
  { id: "p-chris", name: "Chris Novak", nickname: "Nova", city: "Scranton", position: "Guard", heightIn: 72, dna: { slasher: 50, shooter: 88, defender: 40, playmaker: 58, post: 15 }, mmr: 1533, trust: { attendance: 86, sportsmanship: 4.3, confirmedGames: 31 }, availableNow: false,
    character: char({ skin: 0, hair: "buzz", jersey: { primary: "#56B8E8", secondary: "#FFF9F0", number: "30", cut: "tee" }, effects: ["shooter"] }) },
  { id: "p-andre", name: "Andre Wallace", nickname: "Dre", city: "Scranton", position: "Big", heightIn: 81, dna: { slasher: 35, shooter: 30, defender: 85, playmaker: 28, post: 79 }, mmr: 1455, trust: { attendance: 95, sportsmanship: 4.7, confirmedGames: 38 }, availableNow: true,
    character: char({ build: "strong", skin: 4, hair: "locs", jersey: { primary: "#F4C65E", secondary: "#202B30", number: "50", cut: "tank" }, effects: ["defender", "post"] }) },
  { id: "p-sofia", name: "Sofía Marte", nickname: "Sofi", city: "Scranton", position: "Wing", heightIn: 68, dna: { slasher: 70, shooter: 62, defender: 60, playmaker: 55, post: 20 }, mmr: 1402, trust: { attendance: 92, sportsmanship: 4.8, confirmedGames: 19 }, availableNow: true,
    character: char({ skin: 2, hair: "locs", jersey: { primary: "#F47B35", secondary: "#FFF9F0", number: "11", cut: "tee" }, effects: ["slasher"] }) },
  { id: "p-ben", name: "Ben Kowalski", nickname: "Kowal", city: "Dunmore", position: "Forward", heightIn: 79, dna: { slasher: 42, shooter: 75, defender: 46, playmaker: 39, post: 61 }, mmr: 1311, trust: { attendance: 81, sportsmanship: 4.2, confirmedGames: 14 }, availableNow: false,
    character: char({ skin: 0, hair: "fade", jersey: { primary: "#239B72", secondary: "#202B30", number: "33", cut: "tee" }, effects: ["shooter", "post"] }) },
];

const code = (s: string) => s;

export const runs: Run[] = [
  { id: "r-northside-eve", courtId: "c-northside", hostId: "p-marcus", title: "Northside after-work run", startsAt: h(2, 30), format: "3v3", target: 21, capacity: 6, mode: "ranked", visibility: "public", requirement: "Call your own fouls. Winners stay on.", participants: ["p-marcus", "p-yari", "p-kev", "p-luisa"], checkedIn: [], teams: null, status: "open", code: code("NSC-4821"), submissions: [], recurring: "Weekdays · 6:30pm", demoSeeded: true },
  { id: "r-elmyard-1v1", courtId: "c-elmyard", hostId: "p-deshawn", title: "Elm Yard 1v1 ladder", startsAt: h(4), format: "1v1", target: 11, capacity: 2, mode: "ranked", visibility: "public", participants: ["p-deshawn"], checkedIn: [], teams: null, status: "open", code: code("ELM-1107"), submissions: [], demoSeeded: true },
  { id: "r-hilltop-open", courtId: "c-hilltop", hostId: "p-tasha", title: "Hilltop open gym — 5s", startsAt: h(26), format: "5v5", target: 15, capacity: 10, mode: "casual", visibility: "public", requirement: "Day pass at the front desk.", participants: ["p-tasha", "p-marcus", "p-kev", "p-luisa", "p-yari", "p-deshawn", "p-sofia"], checkedIn: [], teams: null, status: "open", code: code("HIL-5530"), submissions: [], recurring: "Tue & Thu · 6pm", demoSeeded: true },
  { id: "r-riverside-sat", courtId: "c-riverside", hostId: "p-omar", title: "Riverside Saturday run", startsAt: h(40), format: "3v3", target: 21, capacity: 6, mode: "ranked", visibility: "public", requirement: "Competitive. Bring a dark and a light shirt.", participants: ["p-omar", "p-chris", "p-andre", "p-sofia"], checkedIn: [], teams: null, status: "open", code: code("RIV-2140"), submissions: [], recurring: "Saturdays · 9am", demoSeeded: true },
  { id: "r-electric-2s", courtId: "c-electric", hostId: "p-andre", title: "Electric City 2s", startsAt: h(30), format: "2v2", target: 15, capacity: 4, mode: "casual", visibility: "public", participants: ["p-andre", "p-ben", "p-sofia"], checkedIn: [], teams: null, status: "open", code: code("ELC-0215"), submissions: [], demoSeeded: true },
  // The user's game that is about to tip — drives the guided game loop.
  { id: "r-northside-now", courtId: "c-northside", hostId: ME, title: "J-Rise's 3s", startsAt: h(0, 10), format: "3v3", target: 21, capacity: 6, mode: "ranked", visibility: "private", participants: [ME, "p-marcus", "p-yari", "p-kev", "p-luisa", "p-omar"], checkedIn: ["p-marcus", "p-yari"], teams: { a: [ME, "p-marcus", "p-yari"], b: ["p-kev", "p-luisa", "p-omar"] }, status: "checkin", code: code("NSC-7714"), submissions: [], demoSeeded: true },
];

export const history: GameRecord[] = [
  { runId: "g-101", date: daysAgo(2), courtId: "c-northside", format: "3v3", mode: "ranked", result: "W", score: "21–17", line: { pts: 9, ast: 2, reb: 5, stl: 1, blk: 0, tov: 2 }, verification: "opponent", mmrDelta: 14 },
  { runId: "g-100", date: daysAgo(5), courtId: "c-elmyard", format: "1v1", mode: "ranked", result: "W", score: "11–8", line: { pts: 11, ast: 0, reb: 4, stl: 2, blk: 1, tov: 1 }, verification: "opponent", mmrDelta: 11 },
  { runId: "g-099", date: daysAgo(7), courtId: "c-hilltop", format: "5v5", mode: "casual", result: "L", score: "13–15", line: { pts: 6, ast: 3, reb: 4, stl: 0, blk: 0, tov: 3 }, verification: "participant" },
  { runId: "g-098", date: daysAgo(9), courtId: "c-northside", format: "3v3", mode: "ranked", result: "W", score: "21–19", line: { pts: 10, ast: 1, reb: 6, stl: 1, blk: 1, tov: 1 }, verification: "opponent", mmrDelta: 12 },
  { runId: "g-097", date: daysAgo(12), courtId: "c-riverside", format: "3v3", mode: "ranked", result: "L", score: "16–21", line: { pts: 5, ast: 2, reb: 3, stl: 0, blk: 0, tov: 4 }, verification: "participant", mmrDelta: -9 },
  { runId: "g-096", date: daysAgo(15), courtId: "c-northside", format: "2v2", mode: "casual", result: "W", score: "15–12", line: { pts: 8, ast: 2, reb: 4, stl: 1, blk: 0, tov: 1 }, verification: "self" },
];

export const reflections: Reflection[] = [
  { runId: "g-101", date: daysAgo(2), scoring: ["Drives", "Finishing through contact"], strongest: "Getting downhill off the catch", difficult: "Left-hand finishes in traffic", improve: "Weak-hand layups" },
  { runId: "g-100", date: daysAgo(5), scoring: ["Drives", "Mid-range"], strongest: "First step", learned: "Pull-up is there when they sag off" },
  { runId: "g-098", date: daysAgo(9), scoring: ["Finishing through contact", "Putbacks", "Drives"], strongest: "Crashing the glass", difficult: "Free throws" },
  { runId: "g-097", date: daysAgo(12), scoring: ["Three-pointers"], difficult: "They went under every screen and I kept settling", learned: "Should have kept attacking" },
];

export const squads: Squad[] = [
  { id: "s-sunrise", name: "Sunrise Six", city: "Hazleton", tagline: "6:30am before work. Every weekday.", members: ["p-marcus", "p-yari", "p-kev"], record: { w: 18, l: 9 }, color: "#F4C65E", open: true, homeCourtId: "c-northside" },
  { id: "s-cedar", name: "Cedar Street Runners", city: "Hazleton", tagline: "Schoolyard legends, grown up.", members: ["p-tasha", "p-luisa", "p-deshawn"], record: { w: 22, l: 6 }, color: "#239B72", open: false, homeCourtId: "c-schoolyard" },
  { id: "s-electric", name: "Electric Five", city: "Scranton", tagline: "League night regulars.", members: ["p-omar", "p-chris", "p-andre", "p-sofia"], record: { w: 25, l: 11 }, color: "#56B8E8", open: true, homeCourtId: "c-electric" },
  { id: "s-corners", name: "Corner Three Club", city: "Dunmore", tagline: "Shooters only. Mostly.", members: ["p-ben"], record: { w: 7, l: 8 }, color: "#F47B35", open: true, homeCourtId: "c-dunmore" },
];

export const challenges: Challenge[] = [
  { id: "ch-1", title: "Sunrise Six vs Electric Five", from: "s-electric", to: "s-sunrise", courtId: "c-riverside", when: daysAhead(6, 9), format: "3v3", status: "open" },
  { id: "ch-2", title: "Dash wants a rematch", from: "p-deshawn", to: ME, courtId: "c-elmyard", when: daysAhead(2, 17), format: "1v1", status: "open" },
];

export const opportunities: Opportunity[] = [
  { id: "o-summer3", title: "Hazleton Summer 3v3 Classic", org: "Demo: Hazleton Parks & Rec (fictional listing)", type: "Tournament", city: "Hazleton", date: daysAhead(18, 9), eligibility: "Teams of 3–4, 18+", cost: "$40 / team", organizerVerified: true, summary: "Double-elimination 3v3 on the Northside courts. Divisions by rating band.", details: ["16 team cap", "Games to 21, win by 2", "Bracket seeded from RUN IT ranked play (opt-in)"], spots: 5 },
  { id: "o-refs", title: "Become a rec-league referee", org: "Demo: NEPA Officials Association (fictional)", type: "Refereeing", city: "Scranton", date: daysAhead(10, 18), eligibility: "18+", cost: "Free · paid games after certification", organizerVerified: true, summary: "Two evening clinics, then shadow three games. Paid per game after that.", details: ["Clinic covers mechanics & rules", "Whistle and shirt provided", "Flexible weekend schedule"] },
  { id: "o-mentor", title: "Youth league volunteer coach", org: "Demo: Westside Youth Hoops (fictional)", type: "Coaching", city: "West Hazleton", date: daysAhead(21, 10), eligibility: "Coaches & mentors (background check)", cost: "Volunteer", organizerVerified: true, summary: "Coach a U12 team on Saturday mornings. Clearances handled by the league.", details: ["PA clearances required (league covers fees)", "Coaching clinic included", "No direct messaging with minors through RUN IT"] },
  { id: "o-showcase", title: "Adult league open tryout night", org: "Demo: Electric City Rec (fictional)", type: "Showcase", city: "Scranton", date: daysAhead(12, 19), eligibility: "18+", cost: "$10", organizerVerified: true, summary: "Drafts for the winter adult league. Coaches pick teams from the run.", details: ["Bring your RUN IT card (optional)", "Two scrimmage rotations", "Draft is decided by league coaches, not RUN IT ratings"] },
  { id: "o-job", title: "Weekend gym supervisor", org: "Demo: Hilltop Rec Center (fictional)", type: "Employment", city: "Hazleton", date: daysAhead(4, 9), eligibility: "18+", cost: "Part-time · paid", organizerVerified: true, summary: "Open and close the gym, run the scoreboard, keep the run fair.", details: ["Sat & Sun 12–6pm", "First aid certification preferred", "Apply through the rec center"] },
  { id: "o-camp", title: "Finishing & footwork clinic", org: "Demo: independent trainer (unverified)", type: "Training", city: "Hazleton", date: daysAhead(8, 17), eligibility: "18+", cost: "$25", organizerVerified: false, summary: "90-minute small-group session on finishing through contact and weak-hand work.", details: ["8 players max", "Organizer verification pending — review before paying"] },
  { id: "o-sponsor", title: "Local sponsor: squad jerseys", org: "Demo: a Scranton print shop (fictional)", type: "Sponsorship", city: "Scranton", date: daysAhead(30, 12), eligibility: "18+", cost: "Free for selected squads", organizerVerified: true, summary: "Two squads with a public record get a jersey set in exchange for a logo on the back.", details: ["Apply as a squad", "Selection by the sponsor", "No exclusivity"] },
  { id: "o-cleanup", title: "Court cleanup & net install day", org: "Demo: Laurel Run neighbors (fictional)", type: "Community", city: "Hazleton", date: daysAhead(9, 9), eligibility: "All ages", cost: "Free", organizerVerified: false, summary: "Replace the torn nets and paint the free-throw lines at Laurel Run.", details: ["Bring gloves", "Pizza after", "Under 18s attend with a guardian"] },
];

export const activity: ActivityItem[] = [
  { id: "a1", at: h(-1), text: "Big Bell called a run at Northside Commons", kind: "run" },
  { id: "a2", at: h(-3), text: "Laurel Run Courts got its 3rd community confirmation", kind: "court" },
  { id: "a3", at: h(-5), text: "Electric Five beat Corner Three Club 21–14", kind: "squad" },
  { id: "a4", at: h(-20), text: "Yari's Player DNA shifted toward Floor General", kind: "achievement" },
  { id: "a5", at: h(-26), text: "New listing: Hazleton Summer 3v3 Classic", kind: "opportunity" },
];

// Every confirmed and unconfirmed game played at each court — the source for court records and passports.
export const courtGames = [...seedCourtGames(courts, players, ME), ...myCourtGames(ME, (n) => daysAgo(n))];

// "Got next" lines at courts (fictional). Size = how many in the group, including the person who signed up.
export const queues: Record<string, { id: string; playerId: string; size: number; at: string }[]> = {
  "c-northside": [
    { id: "q1", playerId: "p-kev", size: 3, at: h(-0.4) },
    { id: "q2", playerId: "p-luisa", size: 2, at: h(-0.2) },
  ],
  "c-riverside": [{ id: "q3", playerId: "p-sofia", size: 3, at: h(-0.3) }],
  "c-elmyard": [{ id: "q4", playerId: "p-deshawn", size: 1, at: h(-0.1) }],
};
