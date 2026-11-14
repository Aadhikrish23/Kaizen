# Meal recommendations are deterministic (no AI): 200 and an array, possibly empty on an empty food DB.
rec=$(curl -s -w '\n%{http_code}' "$BASE/ai/recommendations" -H "Authorization: Bearer $token")
rec_code=$(echo "$rec" | tail -n 1)
rec_body=$(echo "$rec" | sed '$d')
[ "$rec_code" = 200 ] || fail "expected 200 for recommendations, got $rec_code: $rec_body"
echo "$rec_body" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert isinstance(d, list), d
' || fail "recommendations data is not an array: $rec_body"
