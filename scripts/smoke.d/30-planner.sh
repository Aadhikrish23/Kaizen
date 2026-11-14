# Planner activate-day accepts only a boolean `force` (validated before any DB work).
code=$(http_code -X POST "$BASE/planner/activate" -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' -d '{"dayNumber":1,"force":"yes"}')
[ "$code" = 400 ] || fail "expected 400 for non-boolean force on planner activate, got $code"
