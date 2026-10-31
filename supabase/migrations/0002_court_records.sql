-- Court records, court passport, badges.
-- Rule: only opponent-confirmed results feed records, stamps and badges.

-- Where a court is, for state- and county-wide quests ("win at every court in Pennsylvania").
alter table courts add column state_code char(2);
alter table courts add column county text;
create index courts_state_county on courts (state_code, county);

-- Result confirmation. Set by a server function once at least one player on EACH team confirms the final.
alter table game_results add column winning_team_id uuid references game_teams(id);
alter table game_results add column opponent_confirmed boolean not null default false;
alter table game_results add column confirmed_at timestamptz;

-- Per-court totals for every player, from confirmed results only.
create materialized view court_player_totals as
select
  g.court_id,
  gp.user_id,
  count(*)                                                        as games,
  count(*) filter (where gp.team_id = r.winning_team_id)          as wins,
  min(g.starts_at) filter (where gp.team_id = r.winning_team_id)  as first_win_at,
  max(g.starts_at)                                                as last_played_at
from game_results r
join games g on g.id = r.game_id
join game_participants gp on gp.game_id = g.id and gp.left_at is null
where r.opponent_confirmed
group by g.court_id, gp.user_id;

create unique index court_player_totals_pk on court_player_totals (court_id, user_id);
create index court_player_totals_leader on court_player_totals (court_id, wins desc);

-- Best single game at each court (points), from opponent-confirmed stat lines only.
create materialized view court_best_games as
select distinct on (g.court_id)
  g.court_id, s.user_id, s.pts, g.starts_at
from player_game_stats s
join games g on g.id = s.game_id
join game_results r on r.game_id = g.id and r.opponent_confirmed
where s.verification in ('opponent', 'video')
order by g.court_id, s.pts desc, g.starts_at asc;

create unique index court_best_games_pk on court_best_games (court_id);

-- Record holders. Ties are kept (rank = 1 for everyone tied).
create view court_leaders as
select court_id, user_id, wins, rank() over (partition by court_id order by wins desc) as place
from court_player_totals
where wins > 0;

-- Passport: one row per court the player has played, stamped if they've won there.
create view passport_stamps as
select t.user_id, t.court_id, c.state_code, c.county, c.city,
       t.wins > 0 as stamped, t.first_win_at, t.wins, t.games
from court_player_totals t join courts c on c.id = t.court_id;

-- Progress toward "every court in <state>": counts only courts players have verified.
create view state_progress as
select p.user_id, c.state_code,
       count(*) filter (where p.stamped) as courts_won,
       (select count(*) from courts c2 where c2.state_code = c.state_code
          and c2.verification in ('community_verified', 'officially_verified')) as courts_in_state
from passport_stamps p join courts c on c.id = p.court_id
group by p.user_id, c.state_code;

-- Badges
create table badges (
  key text primary key,
  name text not null,
  how text not null,
  target integer                      -- e.g. 3 courts, 10 wins; null for one-off badges
);

create table player_badges (
  user_id uuid references users(id) on delete cascade,
  badge_key text references badges(key),
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

insert into badges (key, name, how, target) values
  ('first_stamp', 'First stamp', 'Win a confirmed game at any court.', 1),
  ('road_win', 'Road win', 'Win a confirmed game in a city that isn''t your home city.', 1),
  ('three_courts', 'Three-court run', 'Win at three different courts.', 3),
  ('home_court', 'Home court', 'Win 10 confirmed games at one court.', 10),
  ('court_king', 'King of the court', 'Hold the most-wins record at any court.', 1),
  ('every_city_court', 'Every court in town', 'Win at every verified court in your city.', null),
  ('every_state_court', 'Every court in the state', 'Win at every verified court in your state.', null);

-- Refresh after each confirmation (call from the confirmation server function, or on a schedule).
create or replace function refresh_court_records() returns void language sql security definer set search_path = public as $$
  refresh materialized view concurrently court_player_totals;
  refresh materialized view concurrently court_best_games;
$$;

-- Access: records and badges are public; only the service role writes them.
alter table badges enable row level security;
alter table player_badges enable row level security;
create policy badges_read on badges for select using (true);
create policy player_badges_read on player_badges for select using (
  not exists (select 1 from blocks b where (b.blocker_id = auth.uid() and b.blocked_id = user_id) or (b.blocker_id = user_id and b.blocked_id = auth.uid()))
);
-- Players can never mark their own results confirmed.
create policy results_no_self_confirm on game_results for update using (false);
