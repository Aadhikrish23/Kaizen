import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import * as aiController from './ai.controller';
import * as weeklyInsightController from './weeklyInsight.controller';
import * as searchController from '../search/search.controller';
import { searchSchema } from '../search/search.schema';
import { chatSchema } from './ai.schema';

const router = Router();
router.use(protect);

router.post('/parse-food', aiController.parseFoodText);
router.get('/insights', aiController.getInsights);
router.get('/insight/weekly', weeklyInsightController.weeklyInsight);
router.get('/recommendations', aiController.getRecommendations);
router.post('/chat', validateRequest(chatSchema), aiController.chatWithCoach);
router.get('/search', validateRequest(searchSchema), searchController.globalSearch);

export default router;
