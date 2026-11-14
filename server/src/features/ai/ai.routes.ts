import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import * as aiController from './ai.controller';
import { chatSchema, parseFoodSchema, recommendationsSchema } from './ai.schema';

const router = Router();
router.use(protect);

router.post('/parse-food', validateRequest(parseFoodSchema), aiController.parseFoodText);
router.get('/insights', aiController.getInsights);
router.get('/recommendations', validateRequest(recommendationsSchema), aiController.getRecommendations);
router.post('/chat', validateRequest(chatSchema), aiController.chatWithCoach);
router.get('/search', aiController.globalSearch);

export default router;
