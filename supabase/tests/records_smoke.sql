-- Two games at one court: one opponent-confirmed, one not. Only the confirmed one should count.
reset role;
insert into auth.users values ('33333333-3333-3333-3333-333333333333') on conflict do nothing;
insert into users (id, birth_date) values ('33333333-3333-3333-3333-333333333333','1990-05-05') on conflict do nothing;
update courts set state_code = 'PA', county = 'Luzerne', verification = 'community_verified';
do $$
declare c uuid; g1 uuid; g2 uuid; ta uuid; tb uuid; ta2 uuid; tb2 uuid;
begin
  select id into c from courts limit 1;
  insert into games (court_id, host_id, title, starts_at, format, target_score, capacity, checkin_code)
    values (c, '11111111-1111-1111-1111-111111111111', 'G1', now() - interval '2 days', '1v1', 11, 2, 'A') returning id into g1;
  insert into games (court_id, host_id, title, starts_at, format, target_score, capacity, checkin_code)
    values (c, '11111111-1111-1111-1111-111111111111', 'G2', now() - interval '1 day', '1v1', 11, 2, 'B') returning id into g2;
  insert into game_teams (game_id, label) values (g1, 'Shirts') returning id into ta;
  insert into game_teams (game_id, label) values (g1, 'Skins') returning id into tb;
  insert into game_teams (game_id, label) values (g2, 'Shirts') returning id into ta2;
  insert into game_teams (game_id, label) values (g2, 'Skins') returning id into tb2;
  insert into game_participants (game_id, user_id, team_id) values
    (g1, '11111111-1111-1111-1111-111111111111', ta), (g1, '33333333-3333-3333-3333-333333333333', tb),
    (g2, '11111111-1111-1111-1111-111111111111', tb2), (g2, '33333333-3333-3333-3333-333333333333', ta2)
    on conflict do nothing;
  insert into game_results (game_id, team_scores, reported_by, winning_team_id, opponent_confirmed)
    values (g1, '{}', '11111111-1111-1111-1111-111111111111', ta, true),
           (g2, '{}', '33333333-3333-3333-3333-333333333333', ta2, false);
end $$;
select refresh_court_records();
\echo '--- leaders (expect user 1111 with 1 win, user 3333 absent: their win was not confirmed)'
select user_id, wins, place from court_leaders;
\echo '--- passport (expect 1111 stamped, 3333 played but not stamped)'
select user_id, stamped, wins, games from passport_stamps order by user_id;
\echo '--- state progress (expect 1111: 1 of 1 PA courts)'
select user_id, state_code, courts_won, courts_in_state from state_progress order by user_id;
