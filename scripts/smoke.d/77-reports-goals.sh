# Reports: validated period; always 200 with daysWithData and an explicit not-enough-data statement for thin data.
rp=$(curl -s -w '\n%{http_code}' "$BASE/reports?period=weekly" -H "Authorization: Bearer $token")
rp_code=$(echo "$rp" | tail -n 1)
rp_body=$(echo "$rp" | sed '$d')
[ "$rp_code" = 200 ] || fail "expected 200 for weekly report, got $rp_code: $rp_body"
echo "$rp_body" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert d["period"] == "weekly" and isinstance(d["daysWithData"], int), d
assert d["daysInPeriod"] == 7 and len(d["days"]) == 7, d
if not d["sufficient"]:
    assert d["notEnoughData"].startswith("Not enough data") and d["calories"] is None, d
' || fail "unexpected weekly report: $rp_body"

code=$(http_code "$BASE/reports?period=yearly" -H "Authorization: Bearer $token")
[ "$code" = 400 ] || fail "expected 400 for invalid report period, got $code"
code=$(http_code "$BASE/reports?period=daily&date=2026-02-30" -H "Authorization: Bearer $token")
[ "$code" = 400 ] || fail "expected 400 for an impossible report date, got $code"

# Goals: a goal with a future target date is stored and logged in the goal history; a past date is rejected.
gl_future=$(python3 -c 'from datetime import date, timedelta; print(date.today() + timedelta(days=120))')
code=$(http_code -X PATCH "$BASE/profile" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d "{\"goal\":\"lose_weight\",\"targetWeightKg\":70,\"targetDate\":\"$gl_future\"}")
[ "$code" = 200 ] || fail "expected 200 for setting a goal with a future target date, got $code"
code=$(http_code -X PATCH "$BASE/profile" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"targetDate":"2020-01-01"}')
[ "$code" = 400 ] || fail "expected 400 for a past target date, got $code"
code=$(http_code -X PATCH "$BASE/profile" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"targetWeightKg":5}')
[ "$code" = 400 ] || fail "expected 400 for an implausible target weight, got $code"

gh=$(curl -s -w '\n%{http_code}' "$BASE/profile/goal-history" -H "Authorization: Bearer $token")
gh_code=$(echo "$gh" | tail -n 1)
gh_body=$(echo "$gh" | sed '$d')
[ "$gh_code" = 200 ] || fail "expected 200 for goal history, got $gh_code: $gh_body"
echo "$gh_body" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert isinstance(d, list) and len(d) >= 1, d
e = d[0]
assert e["goal"] == "lose_weight" and e["targetWeightKg"] == 70 and set(e["changed"]) >= {"goal", "targetWeightKg", "targetDate"}, e
' || fail "goal history has no matching entry: $gh_body"

gp=$(curl -s -w '\n%{http_code}' "$BASE/profile/goal-progress" -H "Authorization: Bearer $token")
gp_code=$(echo "$gp" | tail -n 1)
[ "$gp_code" = 200 ] || fail "expected 200 for goal progress, got $gp_code"
echo "$gp" | sed '$d' | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert d["status"] in ("not_enough_data", "ok", "flat", "moving_away", "reached") and d["targetWeightKg"] == 70, d
' || fail "unexpected goal progress response"
