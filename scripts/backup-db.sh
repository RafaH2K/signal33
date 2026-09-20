#!/bin/sh
# Respaldo de la base. Sin esto, una falla del servidor se lleva las reservas.
# Programalo en cron del servidor, por ejemplo cada hora los días previos:
#   0 * * * * cd /ruta/al/proyecto && ./scripts/backup-db.sh >> backups/backup.log 2>&1
set -eu

KEEP_DAYS=${KEEP_DAYS:-14}
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p backups

docker compose exec -T db pg_dump -U "${DATABASE_USER:-postgres}" "${DATABASE_NAME:-signal33}" \
  | gzip > "backups/signal33-${STAMP}.sql.gz"

echo "Respaldo creado: backups/signal33-${STAMP}.sql.gz"
find backups -name 'signal33-*.sql.gz' -mtime "+${KEEP_DAYS}" -delete

# Para restaurar:
#   gunzip -c backups/signal33-XXXX.sql.gz | docker compose exec -T db psql -U postgres -d signal33
