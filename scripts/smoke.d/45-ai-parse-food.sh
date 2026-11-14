# AI food parsing: empty text is rejected; free text returns 200 with parsed items even when the AI service is
# down (CI has none running, so this exercises the regex fallback). Nutrition is never fabricated.
code=$(http_code -X POST "$BASE/ai/parse-food" -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' -d '{"text":""}')
[ "$code" = 400 ] || fail "expected 400 for empty parse-food text, got $code"

pf=$(curl -s -w '\n%{http_code}' -X POST "$BASE/ai/parse-food" -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' -d '{"text":"2 apples"}')
pf_code=$(echo "$pf" | tail -n 1)
pf_body=$(echo "$pf" | sed '$d')
[ "$pf_code" = 200 ] || fail "expected 200 for parse-food '2 apples', got $pf_code: $pf_body"
echo "$pf_body" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert d["source"] in ("ai", "fallback"), d
assert len(d["items"]) >= 1 and "apple" in d["items"][0]["name"], d
for it in d["items"]:
    assert it["source"] in ("database", "estimate"), it
    if it["source"] == "estimate":
        assert it["nutrition"] is None and it["needsConfirmation"] is True, it
' || fail "unexpected parse-food response: $pf_body"
