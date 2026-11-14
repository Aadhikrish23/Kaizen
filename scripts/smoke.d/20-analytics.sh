# Analytics: out-of-range window is rejected.
code=$(http_code "$BASE/analytics?days=99999" -H "Authorization: Bearer $token")
[ "$code" = 400 ] || fail "expected 400 for days=99999, got $code"
