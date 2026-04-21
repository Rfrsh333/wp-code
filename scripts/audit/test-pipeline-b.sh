#!/usr/bin/env bash
# Pipeline B (inschrijven) — Happy Path & Edge Case Tests
# Usage: BASE=http://localhost:3000 bash scripts/audit/test-pipeline-b.sh
#
# Vereist: curl, jq
# LET OP: reCAPTCHA moet uitgeschakeld zijn in development mode
# Pipeline B gebruikt FormData, geen JSON

set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
API="$BASE/api/inschrijven"
PASS=0
FAIL=0
TOTAL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
bold()  { printf "\033[1m%s\033[0m\n" "$1"; }

assert_status() {
  local test_name="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$actual" -eq "$expected" ]; then
    green "  PASS: $test_name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "  FAIL: $test_name — verwacht $expected, kreeg $actual"
    FAIL=$((FAIL + 1))
  fi
}

assert_body_contains() {
  local test_name="$1" expected="$2" body="$3"
  TOTAL=$((TOTAL + 1))
  if echo "$body" | grep -q "$expected"; then
    green "  PASS: $test_name"
    PASS=$((PASS + 1))
  else
    red "  FAIL: $test_name — '$expected' niet in response"
    FAIL=$((FAIL + 1))
  fi
}

# ============================================================
bold "=== Pipeline B: Inschrijven Tests ==="
echo ""

# --- Test B1: Happy path ---
bold "Test B1: Happy path — geldige inschrijving"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -F "voornaam=Audit" \
  -F "achternaam=Test" \
  -F "email=audit-kandidaat-$(date +%s)@toptalentjobs.nl" \
  -F "telefoon=0687654321" \
  -F "stad=Utrecht" \
  -F "geboortedatum=2000-01-15" \
  -F "geslacht=man" \
  -F "horecaErvaring=2-5 jaar" \
  -F "beschikbaarheid=fulltime" \
  -F "beschikbaarVanaf=2026-05-01" \
  -F "motivatie=Audit test motivatie tekst" \
  -F "hoeGekomen=google" \
  -F "uitbetalingswijze=loondienst" \
  -F "functies=bediening" \
  -F "talen=nederlands" \
  -F "recaptchaToken=test-token")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "Succesvol ingeschreven" 200 "$HTTP_CODE"
assert_body_contains "Body bevat success:true" '"success":true' "$BODY"
echo ""

# --- Test B3: ZZP zonder KVK ---
bold "Test B3: ZZP zonder KVK nummer"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -F "voornaam=ZZP" \
  -F "achternaam=Test" \
  -F "email=zzp-test@toptalentjobs.nl" \
  -F "telefoon=0687654321" \
  -F "stad=Utrecht" \
  -F "geboortedatum=1995-06-15" \
  -F "geslacht=vrouw" \
  -F "horecaErvaring=5+ jaar" \
  -F "beschikbaarheid=parttime" \
  -F "beschikbaarVanaf=2026-05-01" \
  -F "motivatie=ZZP test" \
  -F "hoeGekomen=linkedin" \
  -F "uitbetalingswijze=zzp" \
  -F "functies=bediening" \
  -F "talen=nederlands" \
  -F "recaptchaToken=test-token")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "400 bij ZZP zonder KVK" 400 "$HTTP_CODE"
assert_body_contains "KVK foutmelding" "KVK" "$BODY"
echo ""

# --- Test: Missing required fields ---
bold "Test: Ontbrekende verplichte velden"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -F "voornaam=Incomplete" \
  -F "email=test@test.nl" \
  -F "recaptchaToken=test-token")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
assert_status "400 bij ontbrekende velden" 400 "$HTTP_CODE"
echo ""

# --- Test N1: No reCAPTCHA ---
bold "Test N1: Geen reCAPTCHA token"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -F "voornaam=NoRecaptcha" \
  -F "achternaam=Test" \
  -F "email=no-recaptcha@test.nl" \
  -F "telefoon=0612345678")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
assert_status "400 zonder recaptcha" 400 "$HTTP_CODE"
echo ""

# --- Test N2: XSS payload ---
bold "Test N2: XSS payload in motivatie"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -F "voornaam=XSS" \
  -F "achternaam=Test" \
  -F "email=xss-test-$(date +%s)@toptalentjobs.nl" \
  -F "telefoon=0612345678" \
  -F "stad=Utrecht" \
  -F "geboortedatum=2000-01-01" \
  -F "geslacht=man" \
  -F "horecaErvaring=0-1 jaar" \
  -F "beschikbaarheid=fulltime" \
  -F "beschikbaarVanaf=2026-05-01" \
  -F 'motivatie=<img src=x onerror="alert(1)">' \
  -F "hoeGekomen=anders" \
  -F "uitbetalingswijze=loondienst" \
  -F "functies=bediening" \
  -F "talen=nederlands" \
  -F "recaptchaToken=test-token")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
# Dit SLAAGT momenteel (200) maar de XSS gaat ongeescaped in de admin email
# Na de fix zou de data nog steeds geaccepteerd worden maar escaped in email
assert_status "XSS payload geaccepteerd (data ok, email moet escapen)" 200 "$HTTP_CODE"
echo "  INFO: Controleer handmatig of admin email de HTML escaped"
echo ""

# --- Test N3: Ongeldige geboortedatum ---
bold "Test N3: Ongeldige geboortedatum"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -F "voornaam=Datum" \
  -F "achternaam=Test" \
  -F "email=datum-test-$(date +%s)@toptalentjobs.nl" \
  -F "telefoon=0612345678" \
  -F "stad=Utrecht" \
  -F "geboortedatum=niet-een-datum" \
  -F "geslacht=man" \
  -F "horecaErvaring=0-1 jaar" \
  -F "beschikbaarheid=fulltime" \
  -F "beschikbaarVanaf=2026-05-01" \
  -F "motivatie=Datum test" \
  -F "hoeGekomen=google" \
  -F "uitbetalingswijze=loondienst" \
  -F "functies=bediening" \
  -F "talen=nederlands" \
  -F "recaptchaToken=test-token")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
# Huidig gedrag: wordt geaccepteerd (BUG H-1)
# Na fix: zou 400 moeten returnen
echo "  INFO: Huidige status $HTTP_CODE — verwacht 400 na fix H-1"
if [ "$HTTP_CODE" -eq 200 ]; then
  red "  KNOWN BUG (H-1): Ongeldige geboortedatum geaccepteerd"
elif [ "$HTTP_CODE" -eq 400 ]; then
  green "  PASS: Ongeldige geboortedatum afgewezen (fix H-1 is live)"
fi
echo ""

# --- Test: Wrong HTTP method ---
bold "Test: GET in plaats van POST"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
assert_status "405 Method Not Allowed" 405 "$HTTP_CODE"
echo ""

# ============================================================
echo ""
bold "=== Resultaten ==="
echo "Totaal: $TOTAL | $(green "PASS: $PASS") | $(red "FAIL: $FAIL")"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
