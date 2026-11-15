# Recipe privacy: recipes belong to one user. A second registered user must not find the smoke user's recipe through
# the external-recipe local fallback or global search, and regex input is matched literally. Assumes no
# SPOONACULAR_API_KEY (as in CI), so /external/recipes uses its local fallback. Cleans up the recipe it creates;
# the second user is randomised and never touches $HDRS or $token.
rp_name="ZebraPie${RANDOM}${RANDOM}"
rp_email="smoke_other_$(date +%s)_${RANDOM}@example.com"

rp_other=$(curl -s -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Other\",\"email\":\"$rp_email\",\"password\":\"smoke-pass-123\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("accessToken",""))')
[ -n "$rp_other" ] || fail "could not register the second smoke user"

rp_create=$(curl -s -X POST "$BASE/recipes" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d "{\"name\":\"$rp_name\",\"ingredients\":[{\"name\":\"Secret ingredient\",\"servingSize\":\"1 cup\",\"quantity\":1,\"calories\":123}]}")
rp_id=$(echo "$rp_create" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["_id"])') || fail "recipe create failed: $rp_create"

# rp_names <token> <path>: prints the recipe names found at a path (external recipes: data[], search: data.recipes[])
rp_names() {
  curl -s "$BASE$2" -H "Authorization: Bearer $1" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
rows = d["recipes"] if isinstance(d, dict) else d
print("\n".join(r["name"] for r in rows))'
}

# rp_has <token> <path> <name>: succeeds if the path lists the name; fails the smoke run if the request itself fails
rp_has() {
  local out
  out=$(rp_names "$1" "$2") || fail "request failed: $2"
  echo "$out" | grep -qx "$3"
}

# The owner finds it through both paths
rp_has "$token" "/external/recipes?q=$rp_name" "$rp_name" || fail "owner cannot find their own recipe via /external/recipes"
rp_has "$token" "/ai/search?q=$rp_name" "$rp_name" || fail "owner cannot find their own recipe via global search"

# Another user sees nothing, through either path, by name or by a partial query
for q in "$rp_name" "Zebra"; do
  ! rp_has "$rp_other" "/external/recipes?q=$q" "$rp_name" || fail "second user found another user's recipe via /external/recipes?q=$q"
  ! rp_has "$rp_other" "/ai/search?q=$q" "$rp_name" || fail "second user found another user's recipe via /ai/search?q=$q"
done
# Regex metacharacters are literal: ".*" must not match the owner's recipe either
! rp_has "$token" "/external/recipes?q=.*" "$rp_name" || fail "regex input matched a recipe (query is not escaped)"
code=$(http_code "$BASE/external/recipes?q%5B%24ne%5D=x" -H "Authorization: Bearer $rp_other")
[ "$code" = 400 ] || fail "expected 400 for an object-valued q on /external/recipes, got $code"

# The recipe is not listed for the second user
rp_list=$(curl -s "$BASE/recipes" -H "Authorization: Bearer $rp_other")
echo "$rp_list" | grep -q '"success":true' || fail "second user could not list recipes: $rp_list"
! echo "$rp_list" | grep -q "$rp_name" || fail "second user's recipe list contains another user's recipe"

code=$(http_code -X DELETE "$BASE/recipes/$rp_id" -H "Authorization: Bearer $token")
[ "$code" = 200 ] || fail "expected 200 deleting the privacy-test recipe, got $code"
