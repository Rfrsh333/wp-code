#!/bin/bash
# ============================================================================
# TopTalent Jobs — Dagelijkse Database Backup
# ============================================================================
#
# Gebruik:
#   DATABASE_URL="postgresql://..." bash scripts/backup-database.sh
#
# Of met .env.local:
#   source .env.local && bash scripts/backup-database.sh
#
# Output: backups/db/YYYY-MM-DD/toptalent-YYYY-MM-DD.sql.gz
# ============================================================================

set -euo pipefail

# --- Config ---
BACKUP_ROOT="${BACKUP_DIR:-backups/db}"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H%M%S)
BACKUP_PATH="${BACKUP_ROOT}/${DATE}"
FILENAME="toptalent-${DATE}-${TIME}.sql"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# --- Checks ---
if [ -z "${DATABASE_URL:-}" ]; then
  # Probeer Supabase connection string samen te stellen
  if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && [ -n "${SUPABASE_DB_PASSWORD:-}" ]; then
    PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co||')
    DATABASE_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
  else
    echo "FOUT: DATABASE_URL is niet ingesteld."
    echo "Gebruik: DATABASE_URL='postgresql://...' bash scripts/backup-database.sh"
    echo "Of stel NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD in."
    exit 1
  fi
fi

if ! command -v pg_dump &> /dev/null; then
  echo "FOUT: pg_dump is niet geïnstalleerd."
  echo "Installeer met: brew install postgresql (macOS) of apt install postgresql-client (Linux)"
  exit 1
fi

# --- Backup ---
echo "=== TopTalent Database Backup ==="
echo "Datum: ${DATE} ${TIME}"
echo "Output: ${BACKUP_PATH}/${FILENAME}.gz"

mkdir -p "${BACKUP_PATH}"

echo "→ Starten pg_dump..."
START=$(date +%s)

pg_dump "${DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --format=plain \
  -f "${BACKUP_PATH}/${FILENAME}"

END=$(date +%s)
DURATION=$((END - START))
SIZE=$(du -h "${BACKUP_PATH}/${FILENAME}" | cut -f1)

echo "→ pg_dump klaar (${DURATION}s, ${SIZE})"

# --- Comprimeren ---
echo "→ Comprimeren..."
gzip "${BACKUP_PATH}/${FILENAME}"
GZ_SIZE=$(du -h "${BACKUP_PATH}/${FILENAME}.gz" | cut -f1)
echo "→ Gecomprimeerd: ${GZ_SIZE}"

# --- Verificatie ---
echo "→ Verificatie..."
if gzip -t "${BACKUP_PATH}/${FILENAME}.gz" 2>/dev/null; then
  echo "→ Backup integriteit OK"
else
  echo "FOUT: Backup is corrupt!"
  exit 1
fi

# --- Oude backups opruimen ---
echo "→ Opruimen backups ouder dan ${RETENTION_DAYS} dagen..."
find "${BACKUP_ROOT}" -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_ROOT}" -type d -empty -delete 2>/dev/null || true

# --- Optioneel: upload naar externe opslag ---
if [ -n "${BACKUP_REMOTE:-}" ]; then
  echo "→ Uploaden naar ${BACKUP_REMOTE}..."
  if command -v rclone &> /dev/null; then
    rclone copy "${BACKUP_PATH}/${FILENAME}.gz" "${BACKUP_REMOTE}/${DATE}/"
    echo "→ Upload klaar"
  else
    echo "⚠ rclone niet gevonden — skip externe upload"
  fi
fi

# --- Samenvatting ---
echo ""
echo "=== Backup Compleet ==="
echo "Bestand: ${BACKUP_PATH}/${FILENAME}.gz"
echo "Grootte: ${GZ_SIZE}"
echo "Duur:    ${DURATION}s"
echo "========================"
