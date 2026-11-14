import axios from 'axios';
import { z } from 'zod';
import { searchFoods } from '../foods/food.service';
import { buildResult, FoodRecord, ParsedFoodResult, ParsedItem, pickBestFood, regexParseFood, searchTerms } from './foodParsing';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Re-validate the AI service's answer: only names and quantities are accepted, never nutrition.
export const aiParseResponseSchema = z.object({
  items: z
    .array(
      z
        .object({
          name: z.string().min(1).max(100),
          quantity: z.number().gt(0).lte(10000),
          unit: z.string().min(1).max(30),
          grams: z.number().gt(0).lte(100000).nullable().optional(),
          confidence: z.number().min(0).max(1),
        })
        .strict()
    )
    .min(1)
    .max(20),
}).passthrough();

export interface ParseFoodResponse {
  items: ParsedFoodResult[];
  source: 'ai' | 'fallback';
  model?: string;
}

const parseWithAi = async (text: string): Promise<{ items: ParsedItem[]; model?: string }> => {
  const res = await axios.post(`${AI_SERVICE_URL}/api/parse-food`, { text }, { timeout: 15000 });
  const parsed = aiParseResponseSchema.parse(res.data); // throws on invalid output -> caller falls back
  return { items: parsed.items as ParsedItem[], model: typeof res.data?.model_used === 'string' ? res.data.model_used : undefined };
};

const lookupFood = async (userId: string, name: string): Promise<FoodRecord | undefined> => {
  for (const term of searchTerms(name)) {
    const docs = await searchFoods(userId, term, 5);
    const best = pickBestFood(name, docs.map((d: any) => (typeof d.toObject === 'function' ? d.toObject() : d)) as FoodRecord[]);
    if (best) return best;
  }
  return undefined;
};

export const parseFoodFromText = async (userId: string, text: string): Promise<ParseFoodResponse> => {
  let items: ParsedItem[];
  let source: 'ai' | 'fallback' = 'ai';
  let model: string | undefined;
  try {
    ({ items, model } = await parseWithAi(text));
  } catch (err: any) {
    console.warn(`[AI parse-food] AI unavailable or invalid output (${err?.message || err}); using regex fallback.`);
    source = 'fallback';
    items = regexParseFood(text);
  }

  const results: ParsedFoodResult[] = [];
  for (const item of items) {
    results.push(buildResult(item, await lookupFood(userId, item.name)));
  }
  return { items: results, source, ...(model ? { model } : {}) };
};
