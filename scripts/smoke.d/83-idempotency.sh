# Idempotent creates (offline replay): posting the same clientRequestId twice yields ONE document and awards XP once.
# Uses today's date in the user's timezone. Leaves one extra meal and 100 ml of water for today, which later files tolerate.
id_tz=$(curl -s "$BASE/auth/me" -H "Authorization: Bearer $token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["user"].get("timezone") or "UTC")')
id_today=$(python3 -c 'import sys; from datetime import datetime; from zoneinfo import ZoneInfo; print(datetime.now(ZoneInfo(sys.argv[1])).date().isoformat())' "$id_tz")
id_key="smoke-$(date +%s)-${RANDOM}${RANDOM}"
id_xp() { curl -s "$BASE/gamification" -H "Authorization: Bearer $token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["progress"]["xp"])'; }
id_post() { curl -s -X POST "$BASE$1" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "$2"; }
id_field() { python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["'"$1"'"])'; }

xp_before=$(id_xp)

# --- meals
meal_body="{\"name\":\"Smoke Idem Meal\",\"calories\":250,\"mealType\":\"snack\",\"time\":\"10:00 AM\",\"date\":\"$id_today\",\"clientRequestId\":\"meal-$id_key\"}"
m1=$(id_post /meals "$meal_body"); m2=$(id_post /meals "$meal_body")
m1_id=$(echo "$m1" | id_field _id) || fail "meal create failed: $m1"
m2_id=$(echo "$m2" | id_field _id) || fail "meal replay failed: $m2"
[ "$m1_id" = "$m2_id" ] || fail "replayed meal returned a different document ($m1_id vs $m2_id)"
curl -s "$BASE/meals?date=$id_today" -H "Authorization: Bearer $token" | python3 -c '
import sys, json
meals = json.load(sys.stdin)["data"]["meals"]
n = len([m for m in meals if m["name"] == "Smoke Idem Meal"])
assert n == 1, ("expected exactly one replayed meal", n)
' || fail "the replayed meal was created more than once"

# --- water: the total must grow by 100 ml once, not twice
w_before=$(curl -s "$BASE/water?date=$id_today" -H "Authorization: Bearer $token" | id_field totalAmount)
water_body="{\"amount\":100,\"time\":\"10:05\",\"date\":\"$id_today\",\"clientRequestId\":\"water-$id_key\"}"
w1=$(id_post /water "$water_body"); w2=$(id_post /water "$water_body")
[ "$(echo "$w1" | id_field _id)" = "$(echo "$w2" | id_field _id)" ] || fail "replayed water log returned a different document"
w_after=$(curl -s "$BASE/water?date=$id_today" -H "Authorization: Bearer $token" | id_field totalAmount)
[ "$((w_after - w_before))" = 100 ] || fail "expected water total to grow by exactly 100 ml, grew by $((w_after - w_before))"

# --- weight: a replay returns the stored log and does not re-apply the (different) body
k_body="{\"weight\":71.5,\"date\":\"$id_today\",\"clientRequestId\":\"weight-$id_key\"}"
id_post /weight "$k_body" > /dev/null
k2=$(id_post /weight "{\"weight\":99,\"date\":\"$id_today\",\"clientRequestId\":\"weight-$id_key\"}")
[ "$(echo "$k2" | id_field weight)" = "71.5" ] || fail "a replayed weigh-in re-applied its body: $k2"

# --- a malformed key is a validation error, not a silent fallback
code=$(http_code -X POST "$BASE/meals" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d "{\"name\":\"X\",\"calories\":1,\"mealType\":\"snack\",\"time\":\"10:00\",\"date\":\"$id_today\",\"clientRequestId\":\"bad id\"}")
[ "$code" = 400 ] || fail "expected 400 for a malformed clientRequestId, got $code"

# --- XP: the meal was awarded once (+10), never twice (awards are asynchronous, so poll then re-check)
for i in $(seq 1 20); do [ "$(id_xp)" = "$((xp_before + 10))" ] && break; sleep 0.5; done
[ "$(id_xp)" = "$((xp_before + 10))" ] || fail "expected +10 xp for the replayed meal, xp went from $xp_before to $(id_xp)"
sleep 2
[ "$(id_xp)" = "$((xp_before + 10))" ] || fail "a replayed request awarded xp again: $xp_before -> $(id_xp)"
