#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=astro_password="$ASTRO_LOGIN_PASSWORD" <<'SQL'
CREATE ROLE astro_login LOGIN PASSWORD :'astro_password';
SQL