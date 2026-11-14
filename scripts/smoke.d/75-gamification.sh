# Gamification: a rewarded action grants XP and starts a streak; a repeated capped action does not pay twice.
# Awards are fire-and-forget on the server, so each read polls briefly. Uses today's date in the user's timezone
# (set to Asia/Kolkata by 70-timezone.sh). Leaves one meal and one weigh-in for today, which later files tolerate.
gm_tz=$(curl -s "$BASE/auth/me" -H "Authorization: Bearer $token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["user"].get("timezone") or "UTC")')
gm_today=$(python3 -c 'import sys; from datetime import datetime; from zoneinfo import ZoneInfo; print(datetime.now(ZoneInfo(sys.argv[1])).date().isoformat())' "$gm_tz")

# gm_xp: prints the user's current XP
gm_xp() { curl -s "$BASE/gamification" -H "Authorization: Bearer $token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["progress"]["xp"])'; }
# gm_wait_xp <expected>: poll up to ~10s until XP equals the expected value
gm_wait_xp() { local i; for i in $(seq 1 20); do [ "$(gm_xp)" = "$1" ] && return 0; sleep 0.5; done; return 1; }

[ "$(gm_xp)" = 0 ] || fail "expected a fresh user to start with 0 xp, got $(gm_xp)"

code=$(http_code -X POST "$BASE/meals" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Oats\",\"calories\":300,\"mealType\":\"breakfast\",\"time\":\"08:00 AM\",\"date\":\"$gm_today\"}")
[ "$code" = 201 ] || fail "expected 201 for meal log, got $code"
gm_wait_xp 10 || fail "expected 10 xp after the first meal log, got $(gm_xp)"

curl -s "$BASE/gamification" -H "Authorization: Bearer $token" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert d["streak"]["current"] >= 1 and d["streak"]["activeToday"] is True, d["streak"]
assert d["progress"]["level"] == 1, d["progress"]
first = [a for a in d["achievements"] if a["key"] == "first_meal"][0]
assert first["unlocked"] is True, first
assert len(d["achievements"]) >= 10, d["achievements"]
' || fail "unexpected /gamification response after a meal log"

# Weight is capped at one award per day: the second identical log must not add xp.
code=$(http_code -X POST "$BASE/weight" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d "{\"weight\":70,\"date\":\"$gm_today\"}")
[ "$code" = 200 ] || [ "$code" = 201 ] || fail "expected 200/201 for weight log, got $code"
gm_wait_xp 20 || fail "expected 20 xp after the first weigh-in, got $(gm_xp)"
code=$(http_code -X POST "$BASE/weight" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d "{\"weight\":70.5,\"date\":\"$gm_today\"}")
[ "$code" = 200 ] || [ "$code" = 201 ] || fail "expected 200/201 for repeated weight log, got $code"
sleep 2
[ "$(gm_xp)" = 20 ] || fail "repeated capped action changed xp: expected 20, got $(gm_xp)"
