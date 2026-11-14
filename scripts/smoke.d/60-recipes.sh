# Imported recipes keep their totals and do not get fabricated per-ingredient macros.
imp=$(curl -s -X POST "$BASE/external/recipes/import" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"externalId":"smoke","name":"Smoke Stew","servings":2,"calories":400,"protein":20,"carbs":40,"fat":10,"instructions":["Cook"],"source":"local","ingredients":[{"name":"beans","amount":1,"unit":"cup"},{"name":"rice","amount":2,"unit":"cup"}]}')
echo "$imp" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]
assert d["totalCalories"] == 400, d
for ing in d["ingredients"]:
    assert "calories" not in ing and "protein" not in ing, ing
' || fail "recipe import returned fabricated ingredient macros or wrong totals: $imp"
