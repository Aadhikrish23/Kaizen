# Profile updates are a strict whitelist: privileged/internal fields are rejected, and /auth/me no longer returns the
# removed xp/level/streakDays/healthScore placeholders. Rejected requests change nothing, so later files are unaffected.
code=$(http_code -X PATCH "$BASE/profile" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{"role":"admin"}')
[ "$code" = 400 ] || fail "expected 400 for mass-assigning role through PATCH /profile, got $code"
code=$(http_code -X PATCH "$BASE/profile" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{"email":"someone-else@example.com"}')
[ "$code" = 400 ] || fail "expected 400 for mass-assigning email through PATCH /profile, got $code"
code=$(http_code -X PATCH "$BASE/profile" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{"onboardingComplete":false}')
[ "$code" = 400 ] || fail "expected 400 for onboardingComplete=false, got $code"

curl -s "$BASE/auth/me" -H "Authorization: Bearer $token" | python3 -c '
import sys, json
u = json.load(sys.stdin)["data"]["user"]
for k in ("xp", "level", "streakDays", "healthScore", "passwordHash", "role"):
    assert k not in u or k == "role", (k, u)
' || fail "/auth/me still returns removed or sensitive fields"
