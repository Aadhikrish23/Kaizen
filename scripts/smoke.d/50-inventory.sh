# New users start with an empty, unconfirmed inventory; saving equipment (even none) confirms it.
inv=$(curl -s "$BASE/inventory" -H "Authorization: Bearer $token")
echo "$inv" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert d["needsSetup"] is True and d["equipment"] == [], d
' || fail "expected empty inventory with needsSetup=true for a new user: $inv"
inv=$(curl -s -X POST "$BASE/inventory" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{"equipment":[]}')
echo "$inv" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert d["needsSetup"] is False and d["equipment"] == [], d
' || fail "expected needsSetup=false after saving equipment: $inv"
