#!/bin/bash
# ============================================================================
# TopTalent Jobs — Supabase Storage Backup
# ============================================================================
#
# Maakt een lokale kopie van alle Supabase Storage buckets.
# Supabase biedt GEEN automatische Storage backup — dit script is essentieel.
#
# Vereisten:
#   - Node.js 18+
#   - NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY ingesteld
#
# Gebruik:
#   source .env.local && bash scripts/backup-storage.sh
#
# Output: backups/storage/YYYY-MM-DD/<bucket>/<files>
# ============================================================================

set -euo pipefail

# --- Config ---
BACKUP_ROOT="${STORAGE_BACKUP_DIR:-backups/storage}"
DATE=$(date +%Y-%m-%d)
BACKUP_PATH="${BACKUP_ROOT}/${DATE}"
RETENTION_DAYS="${STORAGE_BACKUP_RETENTION_DAYS:-14}"

# Buckets om te backuppen (privaat = belangrijk)
BUCKETS=("kandidaat-documenten" "medewerker-documenten" "editorial-images" "dienst-afbeeldingen")

# --- Checks ---
if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "FOUT: NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn vereist."
  echo "Gebruik: source .env.local && bash scripts/backup-storage.sh"
  exit 1
fi

# --- Backup ---
echo "=== TopTalent Storage Backup ==="
echo "Datum: ${DATE}"
echo "Buckets: ${BUCKETS[*]}"
echo ""

START=$(date +%s)
TOTAL_FILES=0
TOTAL_ERRORS=0

for BUCKET in "${BUCKETS[@]}"; do
  echo "→ Bucket: ${BUCKET}"
  BUCKET_DIR="${BACKUP_PATH}/${BUCKET}"
  mkdir -p "${BUCKET_DIR}"

  # Lijst alle bestanden in de bucket via Supabase REST API
  RESPONSE=$(curl -s \
    "${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/list/${BUCKET}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"prefix":"","limit":10000}')

  # Parse bestandsnamen (eenvoudige JSON parsing)
  FILES=$(echo "$RESPONSE" | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
    if (Array.isArray(data)) {
      data.forEach(f => {
        if (f.name && !f.name.endsWith('/')) {
          console.log(f.name);
        }
      });
    }
  " 2>/dev/null || echo "")

  if [ -z "$FILES" ]; then
    echo "  (leeg of geen toegang)"
    continue
  fi

  FILE_COUNT=0
  while IFS= read -r FILE; do
    [ -z "$FILE" ] && continue

    # Maak subdirectory als nodig
    FILE_DIR=$(dirname "${BUCKET_DIR}/${FILE}")
    mkdir -p "$FILE_DIR"

    # Download bestand
    HTTP_CODE=$(curl -s -o "${BUCKET_DIR}/${FILE}" -w "%{http_code}" \
      "${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${FILE}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

    if [ "$HTTP_CODE" = "200" ]; then
      FILE_COUNT=$((FILE_COUNT + 1))
    else
      echo "  FOUT: ${FILE} (HTTP ${HTTP_CODE})"
      TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
      rm -f "${BUCKET_DIR}/${FILE}" 2>/dev/null
    fi
  done <<< "$FILES"

  BUCKET_SIZE=$(du -sh "${BUCKET_DIR}" 2>/dev/null | cut -f1)
  echo "  ${FILE_COUNT} bestanden (${BUCKET_SIZE})"
  TOTAL_FILES=$((TOTAL_FILES + FILE_COUNT))
done

END=$(date +%s)
DURATION=$((END - START))
TOTAL_SIZE=$(du -sh "${BACKUP_PATH}" 2>/dev/null | cut -f1)

# --- Oude backups opruimen ---
echo ""
echo "→ Opruimen backups ouder dan ${RETENTION_DAYS} dagen..."
find "${BACKUP_ROOT}" -type d -name "20*" -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true

# --- Optioneel: upload naar externe opslag ---
if [ -n "${STORAGE_BACKUP_REMOTE:-}" ]; then
  echo "→ Uploaden naar ${STORAGE_BACKUP_REMOTE}..."
  if command -v rclone &> /dev/null; then
    rclone sync "${BACKUP_PATH}" "${STORAGE_BACKUP_REMOTE}/${DATE}/"
    echo "→ Upload klaar"
  else
    echo "⚠ rclone niet gevonden — skip externe upload"
  fi
fi

# --- Samenvatting ---
echo ""
echo "=== Storage Backup Compleet ==="
echo "Pad:       ${BACKUP_PATH}"
echo "Bestanden: ${TOTAL_FILES}"
echo "Fouten:    ${TOTAL_ERRORS}"
echo "Grootte:   ${TOTAL_SIZE}"
echo "Duur:      ${DURATION}s"
echo "==============================="

if [ $TOTAL_ERRORS -gt 0 ]; then
  echo "⚠ ${TOTAL_ERRORS} bestanden konden niet gedownload worden!"
  exit 1
fi
