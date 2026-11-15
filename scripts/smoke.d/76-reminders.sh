# Reminders: defaults for a new user, validated PUT, and the due list (always 200 with an array).
rem=$(curl -s -w '\n%{http_code}' "$BASE/reminders" -H "Authorization: Bearer $token")
rem_code=$(echo "$rem" | tail -n 1)
rem_body=$(echo "$rem" | sed '$d')
[ "$rem_code" = 200 ] || fail "expected 200 for GET /reminders, got $rem_code: $rem_body"
echo "$rem_body" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert [r["type"] for r in d["reminders"]] == ["water", "meal", "weight", "workout", "sleep"], d
assert all(r["enabled"] is False for r in d["reminders"]), d
' || fail "expected disabled default reminders for a new user: $rem_body"

code=$(http_code -X PUT "$BASE/reminders" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"reminders":[{"type":"water","enabled":true,"times":["09:00","13:30"],"days":[1,2,3,4,5]}],"quietHours":{"enabled":true,"start":"22:30","end":"07:00"}}')
[ "$code" = 200 ] || fail "expected 200 for valid reminder prefs, got $code"

code=$(http_code -X PUT "$BASE/reminders" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"reminders":[{"type":"water","enabled":true,"times":["25:99"]}]}')
[ "$code" = 400 ] || fail "expected 400 for an invalid reminder time, got $code"

curl -s "$BASE/reminders" -H "Authorization: Bearer $token" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
water = [r for r in d["reminders"] if r["type"] == "water"][0]
assert water["enabled"] is True and water["times"] == ["09:00", "13:30"], water
assert d["quietHours"]["enabled"] is True, d
' || fail "saved reminder prefs were not returned by GET /reminders"

due=$(curl -s -w '\n%{http_code}' "$BASE/reminders/due" -H "Authorization: Bearer $token")
due_code=$(echo "$due" | tail -n 1)
due_body=$(echo "$due" | sed '$d')
[ "$due_code" = 200 ] || fail "expected 200 for GET /reminders/due, got $due_code: $due_body"
echo "$due_body" | python3 -c '
import sys, json
assert isinstance(json.load(sys.stdin)["data"], list)
' || fail "reminders/due data is not an array: $due_body"
