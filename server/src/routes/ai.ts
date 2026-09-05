import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import * as aiController from '../controllers/ai.controller';

const router = Router();
router.use(protect);

router.post('/parse-food', aiController.parseFoodText);
router.get('/insights', aiController.getInsights);
router.get('/recommendations', aiController.getRecommendations);
router.post('/chat', aiController.chatWithCoach);
router.get('/search', aiController.globalSearch);

export default router;
