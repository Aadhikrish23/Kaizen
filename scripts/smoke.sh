#!/usr/bin/env bash
# Smoke test against a running server. Usage: scripts/smoke.sh [base_url]
#
# Layout
#   scripts/smoke.sh        shared setup + helpers, then sources scripts/smoke.d/NN-name.sh in lexical order.
#   scripts/smoke.d/*.sh    one file per feature, sourced into this shell (they share the variables below).
#
# HOW TO ADD A CHECK (never edit smoke.sh or another feature's file for this):
#   1. Create scripts/smoke.d/NN-your-feature.sh with a free two-digit prefix (the numbers leave gaps on purpose;
#      pick one between two existing files, or use the next free one below 99). No shebang or `set` needed.
#   2. Use the helpers below and the shared variables: $BASE, $token (Bearer token of the user registered
#      in the setup), $HDRS (response headers of that registration), $EMAIL.
#   3. Fail with `fail "message"` (prints it and exits 1). Do not `exit 0`, and do not define globals other files use.
#
# ORDERING RULES
#   - Files run in filename order; every check runs against the same freshly registered user.
#   - 99-refresh-replay.sh MUST stay last: it reads $HDRS from the registration and rotates the refresh token.
#   - A file that changes user state (e.g. inventory, timezone) must leave it usable for the files after it.
#   - Cookies are Secure in production, so pass them with explicit `-H "Cookie: ..."` headers, not a cookie jar.
set -euo pipefail
BASE="${1:-http://localhost:5000/api/v1}"
EMAIL="smoke_$(date +%s)@example.com"
SMOKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/smoke.d"

# --- helpers ---------------------------------------------------------------
fail() { echo "$*"; exit 1; }

# http_code <curl args...>: prints only the HTTP status code.
http_code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

# auth_get/auth_post <path> [curl args...]: authenticated request, prints the response body.
auth_get()   { local p="$1"; shift; curl -s "$BASE$p" -H "Authorization: Bearer $token" "$@"; }
auth_post()  { local p="$1"; shift; curl -s -X POST "$BASE$p" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' "$@"; }

# --- setup -------------------------------------------------------------------
# Wait for the server and its database connection (health reports db up).
health=""
for i in $(seq 1 30); do
  health=$(curl -sf "$BASE/health" || true)
  echo "$health" | grep -q '"db":"up"' && break
  sleep 1
  [ "$i" = 30 ] && fail "server not healthy (db up) after 30s: $health"
done

# Register the user all checks run as. Headers are kept in $HDRS for the refresh-token check.
HDRS=$(mktemp); trap 'rm -f "$HDRS"' EXIT
reg=$(curl -s -D "$HDRS" -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"smoke-pass-123\"}")
token=$(echo "$reg" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("data",{}).get("accessToken",""))')
[ -n "$token" ] || fail "register failed: $reg"

# --- feature checks ----------------------------------------------------------
shopt -s nullglob
for f in "$SMOKE_DIR"/[0-9][0-9]-*.sh; do
  # shellcheck source=/dev/null
  source "$f"
done
echo "smoke ok"
