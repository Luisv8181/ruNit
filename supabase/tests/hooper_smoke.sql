-- Friends, the got-next line and score taps.
reset role;
set role app;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo '--- send a friend request (expect success)'
insert into friendships (requester_id, addressee_id) values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
\echo '--- accept your own outgoing request (expect 0 rows updated)'
update friendships set status = 'accepted' where requester_id = '11111111-1111-1111-1111-111111111111';
\echo '--- request as someone else (expect error)'
insert into friendships (requester_id, addressee_id) values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');
\echo '--- join the line at a court (expect success)'
insert into court_queue (court_id, user_id, group_size) select id, auth.uid(), 3 from courts limit 1;
\echo '--- put someone else in line (expect error)'
insert into court_queue (court_id, user_id) select id, '22222222-2222-2222-2222-222222222222' from courts limit 1;
\echo '--- score tap in a game you are in (expect success)'
insert into score_events (game_id, recorded_by, target, delta, client_at) select id, auth.uid(), 'self', 2, now() from games where title = 'Run';
\echo '--- score tap with an illegal value (expect error)'
insert into score_events (game_id, recorded_by, target, delta, client_at) select id, auth.uid(), 'self', 9, now() from games where title = 'Run';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '--- the other user accepts (expect 1 row updated)'
update friendships set status = 'accepted', accepted_at = now() where addressee_id = auth.uid();
