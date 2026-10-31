-- Each block marked (expect error) should print an ERROR line; the private read should return 0.
create role app nologin; grant usage on schema public, auth to app; grant all on all tables in schema public to app; grant select on auth.users to app;
insert into auth.users values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
\echo '--- underage account (expect error)'
insert into users (id, birth_date) values ('22222222-2222-2222-2222-222222222222', current_date - interval '15 years');
insert into users (id, birth_date) values ('11111111-1111-1111-1111-111111111111','1998-04-02'),('22222222-2222-2222-2222-222222222222','1995-01-01');
insert into courts (name, city, location, indoor) values ('Test Court','Hazleton', point(-75.97,40.96), false);
set role app;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo '--- read another user''s private row (expect 0)'
select count(*) from users where id = '22222222-2222-2222-2222-222222222222';
insert into games (court_id, host_id, title, starts_at, format, target_score, capacity, checkin_code) select id, auth.uid(), 'Run', now()+interval '1h', '3v3', 21, 6, 'TST-1' from courts;
insert into game_participants (game_id, user_id) select id, auth.uid() from games;
insert into player_game_stats (game_id, user_id, pts) select id, auth.uid(), 9 from games;
\echo '--- confirm your own stat line (expect error)'
insert into stat_confirmations (stat_id, confirmer_id, verdict) select id, auth.uid(), 'confirm' from player_game_stats;
\echo '--- self-promote stats to opponent-confirmed (expect error)'
update player_game_stats set verification = 'opponent';
\echo '--- submit a court as officially verified (expect error)'
insert into courts (name, city, location, indoor, verification, source, created_by) values ('X','Hazleton', point(0,0), false, 'officially_verified','community', auth.uid());
