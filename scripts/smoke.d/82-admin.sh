# Admin API: a normal user gets 403 on every admin route and unauthenticated requests get 401. There is no API way to
# become an admin (only `npm run make-admin`), so the smoke user stays a normal user. All requests are rejected before
# any state changes.
ad_me=$(curl -s "$BASE/auth/me" -H "Authorization: Bearer $token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["user"]["id"])')
for path in /admin/stats "/admin/users" "/admin/users?q=smoke" /admin/foods; do
  code=$(http_code "$BASE$path" -H "Authorization: Bearer $token")
  [ "$code" = 403 ] || fail "expected 403 for a normal user on GET $path, got $code"
  code=$(http_code "$BASE$path")
  [ "$code" = 401 ] || fail "expected 401 without a token on GET $path, got $code"
done
code=$(http_code -X PATCH "$BASE/admin/users/$ad_me" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{"role":"admin"}')
[ "$code" = 403 ] || fail "expected 403 when a normal user tries to make themselves admin via PATCH /admin/users, got $code"
code=$(http_code -X POST "$BASE/admin/foods" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Food","servingSize":"1 g","calories":1}')
[ "$code" = 403 ] || fail "expected 403 for a normal user creating a global food, got $code"
# The role is still not changeable through the profile endpoint either
code=$(http_code -X PATCH "$BASE/profile" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{"role":"admin"}')
[ "$code" = 400 ] || fail "expected 400 for role in PATCH /profile, got $code"
