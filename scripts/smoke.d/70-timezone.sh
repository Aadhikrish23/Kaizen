# Timezone: invalid IANA names are rejected, valid ones persist and are returned by /auth/me.
code=$(http_code -X PATCH "$BASE/profile" -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' -d '{"timezone":"Mars/Olympus"}')
[ "$code" = 400 ] || fail "expected 400 for invalid timezone, got $code"
code=$(http_code -X PATCH "$BASE/profile" -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' -d '{"timezone":"Asia/Kolkata"}')
[ "$code" = 200 ] || fail "expected 200 for valid timezone, got $code"
me_tz=$(curl -s "$BASE/auth/me" -H "Authorization: Bearer $token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["user"].get("timezone",""))')
[ "$me_tz" = "Asia/Kolkata" ] || fail "expected timezone Asia/Kolkata from /auth/me, got '$me_tz'"
