#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'SQL'
GRANT astro_app TO astro_login;
ALTER ROLE astro_login SET search_path = astro;
SQL
