#!/usr/bin/env bash
# Applies the migration to a throwaway local Postgres 16 (PostGIS shimmed) and runs RLS smoke tests.
# Usage: bash supabase/tests/run_local.sh   (needs initdb/pg_ctl/psql on PATH or in /usr/lib/postgresql/16/bin)
set -euo pipefail
PGB=${PGB:-/usr/lib/postgresql/16/bin}; D=$(mktemp -d); trap '$PGB/pg_ctl -D $D/data stop -m fast >/dev/null 2>&1 || true; rm -rf $D' EXIT
$PGB/initdb -D $D/data -A trust -U postgres >/dev/null
$PGB/pg_ctl -D $D/data -o "-k $D -p 5544 -c listen_addresses=" -l $D/log start >/dev/null
python3 - "$D" <<'PY'
import re, sys
s = open("supabase/migrations/0001_init.sql").read()
s = s.replace("create extension if not exists postgis;", "").replace("geography(point, 4326)", "point")
s = re.sub(r"create or replace function courts_near.*?\$\$;", "create function courts_near(lat float8, lng float8, meters int default 8000) returns setof courts language sql stable as $$ select * from courts limit 200 $$;", s, flags=re.S)
pre = "create schema auth; create table auth.users (id uuid primary key);\ncreate function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;\n"
open(sys.argv[1] + "/m.sql", "w").write(pre + s)
PY
psql -h $D -p 5544 -U postgres -v ON_ERROR_STOP=1 -q -f $D/m.sql
psql -h $D -p 5544 -U postgres -v ON_ERROR_STOP=1 -q -f supabase/migrations/0002_court_records.sql
psql -h $D -p 5544 -U postgres -v ON_ERROR_STOP=1 -q -f supabase/migrations/0003_hooper_features.sql
psql -h $D -p 5544 -U postgres -q -f supabase/tests/rls_smoke.sql
psql -h $D -p 5544 -U postgres -q -f supabase/tests/records_smoke.sql
psql -h $D -p 5544 -U postgres -q -f supabase/tests/hooper_smoke.sql
