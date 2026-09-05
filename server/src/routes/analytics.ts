import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

router.use(protect);

router.get('/', analyticsController.getDashboard);

export default router;
