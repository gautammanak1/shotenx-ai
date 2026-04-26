#!/usr/bin/env bash
# Apply public.services + public.transactions to Postgres (Supabase pooler or local).
# Usage:
#   export DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres"
#   ./scripts/apply-supabase-migration.sh
#
# Or: paste the SQL file contents into Supabase Dashboard → SQL Editor → Run.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/supabase/migrations/20260426120000_services_and_transactions.sql"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install PostgreSQL client tools, or run the SQL manually in Supabase SQL Editor."
  exit 1
fi

load_env() {
  local f
  for f in "$ROOT/.env.local" "$ROOT/.env"; do
    if [[ -f "$f" ]]; then
      set -a
      # shellcheck disable=SC1090
      source "$f" 2>/dev/null || true
      set +a
    fi
  done
}

load_env

URL="${DATABASE_URL:-${DIRECT_URL:-${POSTGRES_URL:-${SUPABASE_DB_URL:-}}}}"
if [[ -z "$URL" ]]; then
  echo "No DATABASE_URL (or DIRECT_URL / POSTGRES_URL / SUPABASE_DB_URL) set."
  echo "Get the connection string from: Supabase → Project Settings → Database → Connection string (URI)."
  exit 1
fi

echo "Applying migration via psql…"
psql "$URL" -v ON_ERROR_STOP=1 -f "$SQL"
echo "Done."
