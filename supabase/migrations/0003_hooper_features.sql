-- Friends, the "got next" line, live score taps, phone-to-phone confirmation, and (future) video tracking.

-- ---------- friends ----------
create table friendships (
  requester_id uuid references users(id) on delete cascade,
  addressee_id uuid references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index friendships_addressee on friendships (addressee_id);

-- Short code people can type or scan to add each other. Rotatable.
create table friend_codes (
  user_id uuid primary key references users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{3}-[A-Z2-9]{3}$'),
  rotated_at timestamptz not null default now()
);

-- Invites sent from a phone's contact picker. Only a hash of the contact is kept, never the contact itself.
create table invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references users(id) on delete cascade,
  contact_hash text,
  accepted_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- ---------- got next ----------
create table court_queue (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references courts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  group_size smallint not null default 1 check (group_size between 1 and 5),
  joined_at timestamptz not null default now(),
  called_at timestamptz,              -- when their group was told they're up
  left_at timestamptz,
  unique (court_id, user_id, joined_at)
);
create index court_queue_active on court_queue (court_id, joined_at) where left_at is null and called_at is null;

-- ---------- live scoreboard ----------
-- Every tap is an event, so the final can be rebuilt and disputes can be traced.
create table score_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references games(id) on delete cascade,
  recorded_by uuid not null references users(id),
  target text not null check (target in ('team_a', 'team_b', 'self')),
  delta smallint not null check (delta in (-3, -2, -1, 1, 2, 3)),
  client_at timestamptz not null,     -- phone clock; events made offline sync later
  received_at timestamptz not null default now()
);
create index score_events_game on score_events (game_id, client_at);

-- ---------- how a confirmation happened ----------
alter table stat_confirmations add column method text not null default 'tap'
  check (method in ('tap', 'qr', 'match_code', 'nearby', 'nfc', 'server'));
alter table stat_confirmations add column proximity_proof text; -- e.g. signed Nearby Interaction / NFC exchange id

-- ---------- video tracking (future; tables ready) ----------
create table game_videos (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  recorded_by uuid not null references users(id),
  media_id uuid references media_assets(id) on delete set null,
  all_players_consented boolean not null default false,
  processed_at timestamptz,
  model_version text,
  created_at timestamptz not null default now()
);

-- One row per detected shot. Attribution is a suggestion until a player in the game accepts it.
create table shot_events (
  id bigint generated always as identity primary key,
  video_id uuid not null references game_videos(id) on delete cascade,
  t_ms integer not null,
  made boolean,
  points smallint check (points in (1, 2, 3)),
  shooter_suggested uuid references users(id),
  shooter_confidence real check (shooter_confidence between 0 and 1),
  cues text[] not null default '{}',  -- e.g. {'shoes','jersey_color','court_position'}
  accepted_by uuid references users(id),
  court_x real, court_y real          -- shot chart position, court-normalized 0..1
);
create index shot_events_video on shot_events (video_id, t_ms);

-- ---------- access ----------
alter table friendships enable row level security;
alter table friend_codes enable row level security;
alter table invites enable row level security;
alter table court_queue enable row level security;
alter table score_events enable row level security;
alter table game_videos enable row level security;
alter table shot_events enable row level security;

create policy friendships_mine on friendships for select using (auth.uid() in (requester_id, addressee_id));
create policy friendships_request on friendships for insert with check (requester_id = auth.uid() and status = 'pending');
create policy friendships_accept on friendships for update using (addressee_id = auth.uid()) with check (status = 'accepted');
create policy friendships_remove on friendships for delete using (auth.uid() in (requester_id, addressee_id));

create policy friend_codes_own on friend_codes for select using (user_id = auth.uid());
-- looking up someone else's code goes through a server function, so codes can't be enumerated

create policy invites_own on invites for all using (inviter_id = auth.uid()) with check (inviter_id = auth.uid());

-- the line at a court is public (it's posted at the court anyway); only you can add or remove yourself
create policy queue_read on court_queue for select using (true);
create policy queue_join on court_queue for insert with check (user_id = auth.uid() and called_at is null);
create policy queue_leave on court_queue for update using (user_id = auth.uid());

create policy score_events_read on score_events for select using (is_participant(game_id));
create policy score_events_add on score_events for insert with check (recorded_by = auth.uid() and is_participant(game_id));

create policy game_videos_read on game_videos for select using (is_participant(game_id));
create policy game_videos_add on game_videos for insert with check (recorded_by = auth.uid() and is_participant(game_id));
create policy shot_events_read on shot_events for select using (exists (select 1 from game_videos v where v.id = video_id and is_participant(v.game_id)));
-- shot events are written by the processing service (service role); players accept them via a server function
