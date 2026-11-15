#!/bin/sh
# Crée .env avec des secrets aléatoires (n'écrase jamais un .env existant).
set -eu
[ -f .env ] && { echo ".env existe déjà : rien à faire."; exit 0; }
rnd() { head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
cat > .env <<EOT
POSTGRES_ADMIN_PASSWORD=$(rnd)
ASTRO_LOGIN_PASSWORD=$(rnd)
JWT_SECRET=$(rnd)$(rnd)
DEMO_PASSCODE=APOLLO2026
EOT
echo ".env créé. Lance maintenant : docker compose up --build"
