#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-127.0.0.1:3001}"

expect_status() {
  local url="$1"
  local expected="$2"
  local method="${3:-GET}"
  local data="${4:-}"
  local status

  if [[ "$method" == "POST" ]]; then
    status="$(curl -s -o /dev/null -w "%{http_code}\n" -X POST -d "$data" "http://$BASE$url")"
  else
    status="$(curl -s -o /dev/null -w "%{http_code}\n" "http://$BASE$url")"
  fi

  if [[ "$status" != "$expected" ]]; then
    echo "FAIL $method $url -> $status (expected $expected)"
    return 1
  fi
  echo "OK   $method $url -> $status"
}

echo "Using BASE=$BASE"

# Redirects
expect_status "/klant/uren" "307"
expect_status "/medewerker/diensten" "307"

# Admin endpoints require auth
expect_status "/api/admin/medewerkers" "403"
expect_status "/api/admin/uren" "403"
expect_status "/api/admin/diensten" "403"
expect_status "/api/admin/facturen" "403"
expect_status "/api/admin/zoeken?q=test" "403"
expect_status "/api/admin/stats" "403"

# Factuur PDF without token
expect_status "/api/facturen/123/pdf" "403"

# reCAPTCHA required
expect_status "/api/contact" "400" "POST" "{}"
expect_status "/api/personeel-aanvragen" "400" "POST" "{}"

# Offerte endpoints require auth
expect_status "/api/offerte" "403" "POST" "{}"
expect_status "/api/offerte/send" "403" "POST" "{}"

# Factuur generate/send require auth
expect_status "/api/facturen/generate" "403" "POST" "{}"
expect_status "/api/facturen/send" "403" "POST" "{}"

echo "All security checks passed."
