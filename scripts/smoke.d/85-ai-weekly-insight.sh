# Weekly insight: always 200 (heuristic fallback when the AI service is down, as in CI). A brand-new user has
# no logs, so it must say there is not enough data rather than invent a summary.
wi=$(curl -s -w '\n%{http_code}' "$BASE/ai/insight/weekly" -H "Authorization: Bearer $token")
wi_code=$(echo "$wi" | tail -n 1)
wi_body=$(echo "$wi" | sed '$d')
[ "$wi_code" = 200 ] || fail "expected 200 for weekly insight, got $wi_code: $wi_body"
echo "$wi_body" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert d["category"] == "weekly" and isinstance(d["insight"], str) and d["insight"], d
if not d["sufficient"]:
    assert d["insight"].startswith("Not enough data"), d
' || fail "unexpected weekly insight response: $wi_body"
