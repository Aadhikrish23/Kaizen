# Global search: query length is validated; a valid query returns the four groups (also on the /search alias).
code=$(http_code "$BASE/ai/search?q=a" -H "Authorization: Bearer $token")
[ "$code" = 400 ] || fail "expected 400 for search q too short, got $code"
code=$(http_code "$BASE/ai/search" -H "Authorization: Bearer $token")
[ "$code" = 400 ] || fail "expected 400 for search without q, got $code"

for path in "/ai/search?q=ap" "/search?q=ap"; do
  sr=$(curl -s -w '\n%{http_code}' "$BASE$path" -H "Authorization: Bearer $token")
  sr_code=$(echo "$sr" | tail -n 1)
  sr_body=$(echo "$sr" | sed '$d')
  [ "$sr_code" = 200 ] || fail "expected 200 for $path, got $sr_code: $sr_body"
  echo "$sr_body" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
for k in ("foods", "recipes", "exercises", "routines"):
    assert isinstance(d[k], list) and len(d[k]) <= 8, (k, d)
' || fail "unexpected search response for $path: $sr_body"
done
