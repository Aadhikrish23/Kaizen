# Refresh-token replay: first use rotates (200), reuse of the same token must fail (401).
# MUST RUN LAST: reads the registration headers ($HDRS) and rotates the refresh token.
# Cookie is passed explicitly: in production it is Secure and a jar would not resend it over http.
rt=$(tr -d '\r' < "$HDRS" | sed -n 's/^[Ss]et-[Cc]ookie: refreshToken=\([^;]*\).*/\1/p' | head -1)
[ -n "$rt" ] || fail "no refreshToken cookie set on register"
code=$(http_code -X POST "$BASE/auth/refresh" -H "Cookie: refreshToken=$rt")
[ "$code" = 200 ] || fail "expected 200 on first refresh, got $code"
code=$(http_code -X POST "$BASE/auth/refresh" -H "Cookie: refreshToken=$rt")
[ "$code" = 401 ] || fail "expected 401 on replayed refresh, got $code"
