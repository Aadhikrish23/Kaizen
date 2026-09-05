import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate';
import { getSummarySchema } from '../schemas/summary.schema';
import * as summaryController from '../controllers/summary.controller';

const router = Router();

router.get('/', protect, validateRequest(getSummarySchema), summaryController.getSummary);

export default router;