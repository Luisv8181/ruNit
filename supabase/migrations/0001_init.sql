-- ruNit core schema (PostgreSQL 15 + PostGIS, Supabase).
-- Status: designed and reviewed by hand; NOT yet applied to a live project (no credentials in this build).
-- Principles: public profile vs private account data are separate tables; exact user location is never stored;
-- stats are evidence submitted by participants, never certified by AI; MMR, Player DNA and Trust are separate.

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ---------- enums ----------
create type court_verification as enum ('imported','community_submitted','community_verified','officially_verified');
create type court_access as enum ('public','membership','school_hours');
create type game_format as enum ('1v1','2v2','3v3','5v5');
create type game_mode as enum ('casual','ranked');
create type game_visibility as enum ('public','private');
create type game_status as enum ('open','full','checkin','live','final','reviewed','cancelled');
create type stat_verification as enum ('self','participant','opponent','video');
create type archetype as enum ('slasher','shooter','defender','playmaker','post');
create type opportunity_type as enum ('tournament','camp','showcase','coaching','refereeing','training','employment','sponsorship','community');

-- ---------- accounts (private) ----------
-- users mirrors auth.users; holds private data only the owner can read.
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  legal_name text,
  birth_date date not null,
  home_region text,                                  -- coarse region only, e.g. 'hazleton' — never coordinates
  created_at timestamptz not null default now(),
  constraint launch_adults_only check (birth_date <= (current_date - interval '18 years'))
);

-- ---------- public identity ----------
create table player_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 14),
  display_city text,
  position text check (position in ('Guard','Wing','Forward','Big')),
  height_in smallint check (height_in between 48 and 96),
  bio text check (char_length(bio) <= 280),
  is_public boolean not null default true,
  available_now boolean not null default false,
  available_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index player_profiles_nickname_city on player_profiles (lower(nickname), display_city);

create table player_characters (
  user_id uuid primary key references users(id) on delete cascade,
  config jsonb not null,                              -- layered asset ids + colors; validated in API layer
  equipped_effects archetype[] not null default '{}' check (cardinality(equipped_effects) <= 2),
  updated_at timestamptz not null default now()
);

create table cosmetic_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  item_key text not null,                             -- e.g. 'sleeve.flux', 'fx.slasher'
  source text not null check (source in ('default','earned','event','purchase')),
  acquired_at timestamptz not null default now(),
  unique (user_id, item_key)
);

-- ---------- courts ----------
create table courts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  neighborhood text,
  location geography(point, 4326) not null,
  indoor boolean not null,
  lights boolean,
  surface text,
  access court_access not null default 'public',
  accessible boolean,
  hoops smallint check (hoops between 1 and 20),
  verification court_verification not null default 'imported',
  source text not null default 'osm',                 -- 'osm' | 'community' | 'operator'
  source_ref text,                                    -- e.g. OSM way id
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courts_location_gix on courts using gist (location);
create index courts_city on courts (city);

create table court_amenities (
  court_id uuid references courts(id) on delete cascade,
  amenity text not null,
  primary key (court_id, amenity)
);

create table court_photos (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references courts(id) on delete cascade,
  media_id uuid not null,                             -- fk added below
  uploaded_by uuid not null references users(id),
  credit text,
  created_at timestamptz not null default now()
);

create table court_verification_records (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references courts(id) on delete cascade,
  user_id uuid not null references users(id),
  kind text not null check (kind in ('confirm_exists','correction','report_closed','operator_verify')),
  details text check (char_length(details) <= 500),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique (court_id, user_id, kind, created_at)
);

-- ---------- games ----------
create table games (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references courts(id),
  host_id uuid not null references users(id),
  title text not null check (char_length(title) <= 80),
  starts_at timestamptz not null,
  format game_format not null,
  target_score smallint not null check (target_score in (11, 15, 21)),
  capacity smallint not null check (capacity between 2 and 20),
  mode game_mode not null default 'casual',
  visibility game_visibility not null default 'public',
  requirement text check (char_length(requirement) <= 140),
  recurrence_rule text,                               -- RRULE for recurring runs
  checkin_code text not null,                         -- short code shown as QR; rotated per game
  status game_status not null default 'open',
  created_at timestamptz not null default now()
);
create index games_court_time on games (court_id, starts_at);
create index games_open_upcoming on games (starts_at) where status in ('open','full');

create table game_teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  label text not null,                                -- 'Shirts' / 'Skins'
  unique (game_id, label)
);

create table game_participants (
  game_id uuid references games(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  team_id uuid references game_teams(id),
  joined_at timestamptz not null default now(),
  checked_in_at timestamptz,
  left_at timestamptz,
  primary key (game_id, user_id)
);
create index game_participants_user on game_participants (user_id);

create table game_results (
  game_id uuid primary key references games(id) on delete cascade,
  team_scores jsonb not null,                         -- {team_id: score}
  reported_by uuid not null references users(id),
  confirmed_by uuid[] not null default '{}',
  finalized_at timestamptz
);

create table player_game_stats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  pts smallint not null check (pts between 0 and 200),
  ast smallint not null default 0 check (ast >= 0),
  reb smallint not null default 0 check (reb >= 0),
  stl smallint not null default 0 check (stl >= 0),
  blk smallint not null default 0 check (blk >= 0),
  tov smallint not null default 0 check (tov >= 0),
  verification stat_verification not null default 'self',
  revision smallint not null default 1,
  submitted_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create table stat_confirmations (
  stat_id uuid references player_game_stats(id) on delete cascade,
  confirmer_id uuid references users(id) on delete cascade,
  verdict text not null check (verdict in ('confirm','dispute')),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  primary key (stat_id, confirmer_id)
);

create table game_reviews (                            -- sportsmanship, feeds Trust only
  game_id uuid references games(id) on delete cascade,
  reviewer_id uuid references users(id) on delete cascade,
  subject_id uuid references users(id) on delete cascade,
  sportsmanship smallint check (sportsmanship between 1 and 5),
  showed_up boolean,
  created_at timestamptz not null default now(),
  primary key (game_id, reviewer_id, subject_id),
  check (reviewer_id <> subject_id)
);

create table game_reflections (
  game_id uuid references games(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  scoring_tags text[] not null default '{}',
  strongest text, difficult text, learned text, improve text,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

-- ---------- the three separate systems ----------
create table player_ratings (                          -- MMR: competitive performance
  user_id uuid primary key references users(id) on delete cascade,
  mmr integer not null default 1400,
  ranked_games integer not null default 0,
  region text,
  updated_at timestamptz not null default now()
);
create index player_ratings_region_mmr on player_ratings (region, mmr desc);

create table player_reputation (                       -- Trust: reliability & sportsmanship
  user_id uuid primary key references users(id) on delete cascade,
  attendance_pct numeric(5,2) not null default 100,
  sportsmanship numeric(3,2),
  confirmed_games integer not null default 0,
  updated_at timestamptz not null default now()
);

create table player_development (                      -- Player DNA: how they play
  user_id uuid primary key references users(id) on delete cascade,
  dna jsonb not null default '{"slasher":50,"shooter":50,"defender":50,"playmaker":50,"post":50}',
  change_log jsonb not null default '[]',             -- [{game_id, reasons[]}] — explainable deltas
  updated_at timestamptz not null default now()
);

-- ---------- community ----------
create table squads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 40),
  city text,
  tagline text check (char_length(tagline) <= 80),
  color text,
  home_court_id uuid references courts(id),
  is_open boolean not null default true,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);
create table squad_members (
  squad_id uuid references squads(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null default 'member' check (role in ('captain','member','invited')),
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  from_squad uuid references squads(id), from_user uuid references users(id),
  to_squad uuid references squads(id), to_user uuid references users(id),
  court_id uuid references courts(id),
  proposed_at timestamptz,
  format game_format,
  status text not null default 'open' check (status in ('open','accepted','declined','played','expired')),
  game_id uuid references games(id),
  created_at timestamptz not null default now(),
  check ((from_squad is null) <> (from_user is null)),
  check ((to_squad is null) <> (to_user is null))
);

-- ---------- opportunities ----------
create table organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_user uuid references users(id),
  verified_at timestamptz,                            -- set only by staff after verification
  verification_notes text
);
create table events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references organizers(id),
  title text not null, description text,
  court_id uuid references courts(id),
  starts_at timestamptz not null, ends_at timestamptz,
  min_age smallint not null default 18,
  capacity integer,
  created_at timestamptz not null default now()
);
create table event_registrations (
  event_id uuid references events(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  squad_id uuid references squads(id),
  status text not null default 'registered' check (status in ('registered','waitlist','cancelled','attended')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references organizers(id),
  type opportunity_type not null,
  title text not null, summary text, details text[],
  city text, starts_at timestamptz,
  eligibility text not null,
  min_age smallint not null default 18,
  cost text,
  created_at timestamptz not null default now()
);
create table opportunity_interests (                   -- consent-based: card shared only if opted in
  opportunity_id uuid references opportunities(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  share_card boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (opportunity_id, user_id)
);

-- ---------- notifications, media, safety ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null, title text not null, body text, href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread on notifications (user_id, created_at desc) where read_at is null;

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  storage_path text not null,
  kind text not null check (kind in ('photo','video')),
  game_id uuid references games(id),
  visibility text not null default 'private' check (visibility in ('private','participants','public')),
  created_at timestamptz not null default now()
);
alter table court_photos add constraint court_photos_media_fk foreign key (media_id) references media_assets(id) on delete cascade;

create table blocks (
  blocker_id uuid references users(id) on delete cascade,
  blocked_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id),
  subject_id uuid not null references users(id),
  reason text not null, details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- ---------- helpers ----------
create or replace function is_participant(g uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from game_participants where game_id = g and user_id = auth.uid() and left_at is null)
$$;

-- Nearby courts without exposing anyone's location: caller passes a coarse point (rounded client-side).
create or replace function courts_near(lat double precision, lng double precision, meters integer default 8000)
returns setof courts language sql stable as $$
  select * from courts
  where st_dwithin(location, st_setsrid(st_makepoint(round(lng::numeric, 2)::float, round(lat::numeric, 2)::float), 4326)::geography, least(meters, 50000))
  order by location <-> st_setsrid(st_makepoint(lng, lat), 4326)::geography
  limit 200
$$;

-- ---------- row level security ----------
alter table users enable row level security;
alter table player_profiles enable row level security;
alter table player_characters enable row level security;
alter table cosmetic_inventory enable row level security;
alter table courts enable row level security;
alter table court_amenities enable row level security;
alter table court_photos enable row level security;
alter table court_verification_records enable row level security;
alter table games enable row level security;
alter table game_teams enable row level security;
alter table game_participants enable row level security;
alter table game_results enable row level security;
alter table player_game_stats enable row level security;
alter table stat_confirmations enable row level security;
alter table game_reviews enable row level security;
alter table game_reflections enable row level security;
alter table player_ratings enable row level security;
alter table player_reputation enable row level security;
alter table player_development enable row level security;
alter table squads enable row level security;
alter table squad_members enable row level security;
alter table challenges enable row level security;
alter table organizers enable row level security;
alter table events enable row level security;
alter table event_registrations enable row level security;
alter table opportunities enable row level security;
alter table opportunity_interests enable row level security;
alter table notifications enable row level security;
alter table media_assets enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;

-- private account: owner only
create policy users_owner on users for all using (id = auth.uid()) with check (id = auth.uid());

-- public identity: readable when public and not blocked; writable by owner
create policy profiles_read on player_profiles for select using (
  (is_public or user_id = auth.uid())
  and not exists (select 1 from blocks b where (b.blocker_id = auth.uid() and b.blocked_id = user_id) or (b.blocker_id = user_id and b.blocked_id = auth.uid()))
);
create policy profiles_write on player_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy characters_read on player_characters for select using (true);
create policy characters_write on player_characters for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy inventory_owner on cosmetic_inventory for select using (user_id = auth.uid());

-- courts: world-readable; inserts only as community submissions
create policy courts_read on courts for select using (true);
create policy courts_submit on courts for insert with check (created_by = auth.uid() and verification = 'community_submitted' and source = 'community');
create policy amenities_read on court_amenities for select using (true);
create policy court_photos_read on court_photos for select using (true);
create policy court_photos_add on court_photos for insert with check (uploaded_by = auth.uid());
create policy court_verif_read on court_verification_records for select using (true);
create policy court_verif_add on court_verification_records for insert with check (user_id = auth.uid() and kind <> 'operator_verify');

-- games: public games readable; private only to participants/host
create policy games_read on games for select using (visibility = 'public' or host_id = auth.uid() or is_participant(id));
create policy games_create on games for insert with check (host_id = auth.uid());
create policy games_host_update on games for update using (host_id = auth.uid());
create policy teams_read on game_teams for select using (exists (select 1 from games g where g.id = game_id));
create policy participants_read on game_participants for select using (exists (select 1 from games g where g.id = game_id));
create policy participants_join on game_participants for insert with check (user_id = auth.uid());
create policy participants_self_update on game_participants for update using (user_id = auth.uid());
create policy results_read on game_results for select using (is_participant(game_id) or exists (select 1 from games g where g.id = game_id and g.visibility = 'public'));
create policy results_report on game_results for insert with check (reported_by = auth.uid() and is_participant(game_id));

-- stats: only participants submit their own line; only participants confirm others
create policy stats_read on player_game_stats for select using (true);
create policy stats_submit on player_game_stats for insert with check (user_id = auth.uid() and is_participant(game_id) and verification = 'self');
create policy stats_revise on player_game_stats for update using (user_id = auth.uid()) with check (verification = 'self');
create policy confirm_read on stat_confirmations for select using (true);
create policy confirm_add on stat_confirmations for insert with check (
  confirmer_id = auth.uid()
  and exists (select 1 from player_game_stats s where s.id = stat_id and s.user_id <> auth.uid() and is_participant(s.game_id))
);
create policy reviews_add on game_reviews for insert with check (reviewer_id = auth.uid() and is_participant(game_id));
create policy reviews_own on game_reviews for select using (reviewer_id = auth.uid());
create policy reflections_owner on game_reflections for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- systems: readable, written only by server-side functions (service role)
create policy ratings_read on player_ratings for select using (true);
create policy reputation_read on player_reputation for select using (true);
create policy development_read on player_development for select using (
  user_id = auth.uid() or exists (select 1 from player_profiles p where p.user_id = player_development.user_id and p.is_public)
);

-- community
create policy squads_read on squads for select using (true);
create policy squads_create on squads for insert with check (created_by = auth.uid());
create policy squad_members_read on squad_members for select using (true);
create policy squad_join on squad_members for insert with check (
  user_id = auth.uid() and (role = 'member') and exists (select 1 from squads s where s.id = squad_id and s.is_open)
);
create policy squad_leave on squad_members for delete using (user_id = auth.uid());
create policy challenges_read on challenges for select using (true);

-- opportunities: readable; interest is private to the player (+ organizer via server function honoring share_card)
create policy organizers_read on organizers for select using (true);
create policy events_read on events for select using (true);
create policy opps_read on opportunities for select using (true);
create policy event_reg_owner on event_registrations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy interests_owner on opportunity_interests for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- personal
create policy notifications_owner on notifications for all using (user_id = auth.uid());
create policy media_read on media_assets for select using (
  owner_id = auth.uid() or visibility = 'public' or (visibility = 'participants' and game_id is not null and is_participant(game_id))
);
create policy media_owner on media_assets for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy blocks_owner on blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy reports_create on reports for insert with check (reporter_id = auth.uid());
-- (no select policy on reports: moderators use the service role)
