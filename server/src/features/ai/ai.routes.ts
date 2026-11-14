import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import { aiLightLimiter, aiLlmLimiter } from '../../middleware/aiRateLimit';
import * as aiController from './ai.controller';
import * as weeklyInsightController from './weeklyInsight.controller';
import * as searchController from '../search/search.controller';
import { searchSchema } from '../search/search.schema';
import { chatSchema, parseFoodSchema, recommendationsSchema } from './ai.schema';

const router = Router();
router.use(protect);

// Per-user rate limits (keyed by the authenticated user, so they apply after `protect`).
router.post('/parse-food', aiLlmLimiter, validateRequest(parseFoodSchema), aiController.parseFoodText);
router.get('/insights', aiLlmLimiter, aiController.getInsights);
router.get('/insight/weekly', aiLlmLimiter, weeklyInsightController.weeklyInsight);
router.get('/recommendations', aiLightLimiter, validateRequest(recommendationsSchema), aiController.getRecommendations);
router.post('/chat', aiLlmLimiter, validateRequest(chatSchema), aiController.chatWithCoach);
router.get('/search', aiLightLimiter, validateRequest(searchSchema), searchController.globalSearch);

export default router;
