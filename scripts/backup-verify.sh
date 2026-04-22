#!/bin/bash
# ============================================================================
# TopTalent Jobs — Backup Verificatie
# ============================================================================
#
# Controleert of recente backups bestaan en geldig zijn.
# Gebruik in CI of als handmatige check.
#
# Exit codes:
#   0 = alles OK
#   1 = waarschuwingen
#   2 = kritieke problemen
# ============================================================================

set -euo pipefail

DB_BACKUP_DIR="${BACKUP_DIR:-backups/db}"
STORAGE_BACKUP_DIR="${STORAGE_BACKUP_DIR:-backups/storage}"
MAX_AGE_DB=2          # Database backup mag max 2 dagen oud zijn
MAX_AGE_STORAGE=8     # Storage backup mag max 8 dagen oud zijn

WARNINGS=0
ERRORS=0

echo "=== TopTalent Backup Verificatie ==="
echo "Datum: $(date +%Y-%m-%d)"
echo ""

# --- Database Backup Check ---
echo "→ Database backups controleren..."
if [ -d "$DB_BACKUP_DIR" ]; then
  LATEST_DB=$(find "$DB_BACKUP_DIR" -name "*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

  if [ -z "$LATEST_DB" ]; then
    echo "  KRITIEK: Geen database backups gevonden!"
    ERRORS=$((ERRORS + 1))
  else
    DB_AGE_DAYS=$(( ($(date +%s) - $(stat -f %m "$LATEST_DB" 2>/dev/null || stat -c %Y "$LATEST_DB" 2>/dev/null || echo 0)) / 86400 ))
    DB_SIZE=$(du -h "$LATEST_DB" | cut -f1)

    if [ $DB_AGE_DAYS -gt $MAX_AGE_DB ]; then
      echo "  WAARSCHUWING: Laatste DB backup is ${DB_AGE_DAYS} dagen oud (max ${MAX_AGE_DB})"
      echo "  Bestand: ${LATEST_DB} (${DB_SIZE})"
      WARNINGS=$((WARNINGS + 1))
    else
      echo "  OK: Laatste backup ${DB_AGE_DAYS} dag(en) oud (${DB_SIZE})"
      echo "  Bestand: ${LATEST_DB}"
    fi

    # Integriteitscheck
    if gzip -t "$LATEST_DB" 2>/dev/null; then
      echo "  OK: Integriteitscheck geslaagd"
    else
      echo "  KRITIEK: Backup is corrupt!"
      ERRORS=$((ERRORS + 1))
    fi
  fi
else
  echo "  KRITIEK: Backup directory ${DB_BACKUP_DIR} bestaat niet!"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# --- Storage Backup Check ---
echo "→ Storage backups controleren..."
if [ -d "$STORAGE_BACKUP_DIR" ]; then
  LATEST_STORAGE=$(find "$STORAGE_BACKUP_DIR" -maxdepth 1 -type d -name "20*" | sort -r | head -1)

  if [ -z "$LATEST_STORAGE" ]; then
    echo "  KRITIEK: Geen storage backups gevonden!"
    ERRORS=$((ERRORS + 1))
  else
    STORAGE_DATE=$(basename "$LATEST_STORAGE")
    STORAGE_AGE_DAYS=$(( ($(date +%s) - $(date -j -f "%Y-%m-%d" "$STORAGE_DATE" +%s 2>/dev/null || date -d "$STORAGE_DATE" +%s 2>/dev/null || echo 0)) / 86400 ))
    STORAGE_SIZE=$(du -sh "$LATEST_STORAGE" 2>/dev/null | cut -f1)
    FILE_COUNT=$(find "$LATEST_STORAGE" -type f | wc -l | tr -d ' ')

    if [ $STORAGE_AGE_DAYS -gt $MAX_AGE_STORAGE ]; then
      echo "  WAARSCHUWING: Laatste storage backup is ${STORAGE_AGE_DAYS} dagen oud (max ${MAX_AGE_STORAGE})"
      WARNINGS=$((WARNINGS + 1))
    else
      echo "  OK: Laatste backup ${STORAGE_AGE_DAYS} dag(en) oud"
    fi

    echo "  Pad: ${LATEST_STORAGE}"
    echo "  Bestanden: ${FILE_COUNT}"
    echo "  Grootte: ${STORAGE_SIZE}"

    # Check of kritieke buckets aanwezig zijn
    for BUCKET in kandidaat-documenten medewerker-documenten; do
      if [ -d "${LATEST_STORAGE}/${BUCKET}" ]; then
        BCOUNT=$(find "${LATEST_STORAGE}/${BUCKET}" -type f | wc -l | tr -d ' ')
        echo "  OK: ${BUCKET} (${BCOUNT} bestanden)"
      else
        echo "  WAARSCHUWING: ${BUCKET} ontbreekt in backup!"
        WARNINGS=$((WARNINGS + 1))
      fi
    done
  fi
else
  echo "  KRITIEK: Backup directory ${STORAGE_BACKUP_DIR} bestaat niet!"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# --- Samenvatting ---
echo "=== Resultaat ==="
echo "Fouten:         ${ERRORS}"
echo "Waarschuwingen: ${WARNINGS}"

if [ $ERRORS -gt 0 ]; then
  echo "STATUS: KRITIEK — directe actie vereist!"
  exit 2
elif [ $WARNINGS -gt 0 ]; then
  echo "STATUS: WAARSCHUWING — aandacht nodig"
  exit 1
else
  echo "STATUS: OK"
  exit 0
fi
