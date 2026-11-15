# Ownership: update/upsert bodies are strict whitelists, so a foreign userId (or _id/createdAt) can never be written.
# Creates a routine and a recipe as the smoke user, then deletes them; measurements are keyed per day and left in place.
ow_foreign='64b000000000000000000001'
ow_me=$(curl -s "$BASE/auth/me" -H "Authorization: Bearer $token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["user"]["id"])')
[ -n "$ow_me" ] || fail "could not read the smoke user's id"
ow_today=$(python3 -c 'from datetime import date; print(date.today())')

# --- routines
rt=$(curl -s -X POST "$BASE/routines" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Push","exercises":[{"exerciseName":"Bench Press","targetMuscle":"chest","sets":3,"targetReps":"8-12"}]}')
ow_routine=$(echo "$rt" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["_id"])') || fail "routine create failed: $rt"
code=$(http_code -X PUT "$BASE/routines/$ow_routine" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Push 2\",\"userId\":\"$ow_foreign\"}")
[ "$code" = 400 ] || fail "expected 400 when updating a routine with a foreign userId, got $code"
code=$(http_code -X PUT "$BASE/routines/$ow_routine" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Push 2"}')
[ "$code" = 200 ] || fail "expected 200 for a valid routine update, got $code"
curl -s "$BASE/routines/$ow_routine" -H "Authorization: Bearer $token" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert d["name"] == "Smoke Push 2" and d["userId"] == sys.argv[1], d
' "$ow_me" || fail "routine is no longer owned by the smoke user or was not updated"
code=$(http_code -X DELETE "$BASE/routines/$ow_routine" -H "Authorization: Bearer $token")
[ "$code" = 200 ] || fail "expected 200 deleting the smoke routine, got $code"

# --- recipes
rc=$(curl -s -X POST "$BASE/recipes" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Rice","ingredients":[{"name":"Rice","servingSize":"1 cup","quantity":1,"calories":200,"protein":4,"carbs":40,"fat":1}]}')
ow_recipe=$(echo "$rc" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["_id"])') || fail "recipe create failed: $rc"
code=$(http_code -X POST "$BASE/recipes" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Evil\",\"userId\":\"$ow_foreign\",\"ingredients\":[{\"name\":\"Rice\",\"servingSize\":\"1 cup\",\"quantity\":1,\"calories\":200}]}")
[ "$code" = 400 ] || fail "expected 400 when creating a recipe with a foreign userId, got $code"
code=$(http_code -X PATCH "$BASE/recipes/$ow_recipe" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Rice 2\",\"userId\":\"$ow_foreign\"}")
[ "$code" = 400 ] || fail "expected 400 when updating a recipe with a foreign userId, got $code"
curl -s "$BASE/recipes/$ow_recipe" -H "Authorization: Bearer $token" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert d["userId"] == sys.argv[1] and d["name"] == "Smoke Rice", d
' "$ow_me" || fail "recipe ownership or name changed by a rejected update"
code=$(http_code -X DELETE "$BASE/recipes/$ow_recipe" -H "Authorization: Bearer $token")
[ "$code" = 200 ] || fail "expected 200 deleting the smoke recipe, got $code"

# --- measurements (upsert keyed by the authenticated user and the date)
code=$(http_code -X POST "$BASE/measurements" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d "{\"date\":\"$ow_today\",\"weight\":70,\"userId\":\"$ow_foreign\"}")
[ "$code" = 400 ] || fail "expected 400 when upserting a measurement with a foreign userId, got $code"
code=$(http_code -X POST "$BASE/measurements" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d "{\"date\":\"$ow_today\",\"chestCm\":100}")
[ "$code" = 200 ] || fail "expected 200 for a valid measurement, got $code"
curl -s "$BASE/measurements" -H "Authorization: Bearer $token" | python3 -c '
import sys, json
rows = json.load(sys.stdin)["data"]
assert rows and all(r["userId"] == sys.argv[1] for r in rows), rows
' "$ow_me" || fail "a measurement is not owned by the smoke user"

# --- external recipe import: a missing ingredients array is a 400, not a 500
code=$(http_code -X POST "$BASE/external/recipes/import" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"name":"No ingredients","calories":100,"protein":1,"carbs":1,"fat":1}')
[ "$code" = 400 ] || fail "expected 400 for a recipe import without ingredients, got $code"
