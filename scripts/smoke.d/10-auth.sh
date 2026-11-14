# Auth: protected route needs a token and accepts the registered user's token.
code=$(http_code "$BASE/auth/me")
[ "$code" = 401 ] || fail "expected 401 without token, got $code"

code=$(http_code "$BASE/auth/me" -H "Authorization: Bearer $token")
[ "$code" = 200 ] || fail "expected 200 with token, got $code"
