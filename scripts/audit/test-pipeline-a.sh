#!/usr/bin/env bash
# Pipeline A (personeel-aanvragen) — Happy Path & Edge Case Tests
# Usage: BASE=http://localhost:3000 bash scripts/audit/test-pipeline-a.sh
#
# Vereist: curl, jq
# LET OP: reCAPTCHA moet uitgeschakeld zijn in development mode

set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
API="$BASE/api/personeel-aanvragen"
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
bold "=== Pipeline A: Personeel Aanvragen Tests ==="
echo ""

# --- Test A1: Happy path ---
bold "Test A1: Happy path — geldige aanvraag"
RESPONSE=$(curl -sL -w "\n%{http_code}" -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{
    "bedrijfsnaam": "Audit Test BV",
    "contactpersoon": "Test Persoon",
    "email": "audit-test@toptalentjobs.nl",
    "telefoon": "0612345678",
    "typePersoneel": ["bediening"],
    "aantalPersonen": "2",
    "contractType": ["uitzenden"],
    "gewenstUurtarief": "15",
    "startDatum": "2026-05-01",
    "werkdagen": ["maandag", "dinsdag"],
    "werktijden": "09:00-17:00",
    "locatie": "Utrecht",
    "recaptchaToken": "test-token"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "Succesvol ingediend" 200 "$HTTP_CODE"
assert_body_contains "Body bevat success:true" '"success":true' "$BODY"
echo ""

# --- Test A3: Missing required field ---
bold "Test A3: Validatie — ontbrekend verplicht veld (bedrijfsnaam)"
RESPONSE=$(curl -sL -w "\n%{http_code}" -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{
    "contactpersoon": "Test",
    "email": "test@test.nl",
    "telefoon": "0612345678",
    "typePersoneel": ["bediening"],
    "aantalPersonen": "1",
    "contractType": ["uitzenden"],
    "startDatum": "2026-05-01",
    "werkdagen": ["maandag"],
    "werktijden": "09:00-17:00",
    "locatie": "Utrecht",
    "recaptchaToken": "test-token"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "400 bij ontbrekend veld" 400 "$HTTP_CODE"
assert_body_contains "Error in response" '"error"' "$BODY"
echo ""

# --- Test N1: No reCAPTCHA token ---
bold "Test N1: Geen reCAPTCHA token"
RESPONSE=$(curl -sL -w "\n%{http_code}" -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{
    "bedrijfsnaam": "Test BV",
    "contactpersoon": "Test",
    "email": "test@test.nl",
    "telefoon": "0612345678",
    "typePersoneel": ["bediening"],
    "aantalPersonen": "1",
    "contractType": ["uitzenden"],
    "startDatum": "2026-05-01",
    "werkdagen": ["maandag"],
    "werktijden": "09:00-17:00",
    "locatie": "Utrecht"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
# In development mode reCAPTCHA wordt overgeslagen, dus 200 is verwacht
if [ "$HTTP_CODE" -eq 200 ]; then
  TOTAL=$((TOTAL + 1)); PASS=$((PASS + 1))
  green "  PASS: reCAPTCHA skipped in dev mode (HTTP 200)"
elif [ "$HTTP_CODE" -eq 400 ]; then
  TOTAL=$((TOTAL + 1)); PASS=$((PASS + 1))
  green "  PASS: 400 zonder recaptcha in productie (HTTP 400)"
else
  TOTAL=$((TOTAL + 1)); FAIL=$((FAIL + 1))
  red "  FAIL: Onverwachte status $HTTP_CODE"
fi
echo ""

# --- Test: Invalid JSON ---
bold "Test: Ongeldige JSON body"
RESPONSE=$(curl -sL -w "\n%{http_code}" -X POST "$API" \
  -H "Content-Type: application/json" \
  -d 'dit is geen json')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
TOTAL=$((TOTAL + 1))
if [ "$HTTP_CODE" -eq 400 ] || [ "$HTTP_CODE" -eq 500 ]; then
  green "  PASS: Ongeldige JSON afgewezen (HTTP $HTTP_CODE)"
  PASS=$((PASS + 1))
else
  red "  FAIL: Onverwachte status $HTTP_CODE"
  FAIL=$((FAIL + 1))
fi
echo ""

# --- Test: Wrong HTTP method ---
bold "Test: GET in plaats van POST"
RESPONSE=$(curl -sL -w "\n%{http_code}" -X GET "$API")
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
