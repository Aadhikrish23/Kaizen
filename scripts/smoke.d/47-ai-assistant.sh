# The action assistant (POST /ai/chat) against the real API, with no language model: plain commands, questions about the user's own data,
# undo, and the rule that a question never changes data. Needs the Python AI service (started by the smoke job).
ai_chat() {
  curl -s -X POST "$BASE/ai/chat" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "{\"message\":\"$1\"}"
}
asst_water() {
  # Water logged for the user's own today (their timezone, which an earlier smoke file may have changed).
  curl -s "$BASE/summary?date=$asst_today" -H "Authorization: Bearer $token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["hydration"]["totalWater"])'
}
asst_tz=$(curl -s "$BASE/profile" -H "Authorization: Bearer $token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["user"].get("timezone") or "UTC")')
asst_today=$(ASST_TZ="$asst_tz" python3 -c 'import os,datetime,zoneinfo; print(datetime.datetime.now(zoneinfo.ZoneInfo(os.environ["ASST_TZ"])).strftime("%Y-%m-%d"))')

before=$(asst_water)

# A plain command is carried out and the reply says what happened.
out=$(ai_chat "drank 500 ml water")
echo "$out" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert d["status"] == "SUCCESS" and d["undoAvailable"] is True and "water" in d["changed"], d
assert "500 ml" in d["reply"], d
' || fail "assistant did not log water: $out"
[ "$(asst_water)" = "$((before + 500))" ] || fail "assistant said it logged water but the total did not change"

# A question never changes data.
out=$(ai_chat "should I drink 500 ml of water?")
echo "$out" | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; assert d["changed"] == [], d' || fail "a question changed data: $out"
[ "$(asst_water)" = "$((before + 500))" ] || fail "a question changed the water total"

# A question about the user's own data is answered from the data.
out=$(ai_chat "how much water have i had today?")
echo "$out" | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; assert "500 ml" in d["reply"], d' || fail "data question not answered from the data: $out"

# Undo takes the last change back; a second undo has nothing left.
out=$(ai_chat "undo")
echo "$out" | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; assert d["status"] == "SUCCESS" and "water" in d["changed"], d' || fail "undo failed: $out"
[ "$(asst_water)" = "$before" ] || fail "undo did not restore the water total"
out=$(ai_chat "undo")
echo "$out" | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; assert "nothing to undo" in d["reply"], d' || fail "second undo should find nothing: $out"

# Reset forgets the conversation.
code=$(http_code -X POST "$BASE/ai/assistant/reset" -H "Authorization: Bearer $token")
[ "$code" = 200 ] || fail "expected 200 for assistant reset, got $code"

# Validation and auth are enforced before the AI service is reached.
code=$(http_code -X POST "$BASE/ai/chat" -H 'Content-Type: application/json' -d '{"message":"hi"}')
[ "$code" = 401 ] || fail "expected 401 for assistant chat without a token, got $code"
code=$(http_code -X POST "$BASE/ai/chat" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{"message":""}')
[ "$code" = 400 ] || fail "expected 400 for an empty assistant message, got $code"
