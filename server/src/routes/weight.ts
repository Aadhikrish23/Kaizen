import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate';
import { getDailyWeightSchema, upsertWeightSchema, deleteWeightSchema } from '../schemas/weight.schema';
import * as weightController from '../controllers/weight.controller';

const router = Router();

router.get('/', protect, validateRequest(getDailyWeightSchema), weightController.getDailyLog);
router.post('/', protect, validateRequest(upsertWeightSchema), weightController.upsertWeightLog);
router.delete('/:id', protect, validateRequest(deleteWeightSchema), weightController.deleteWeightLog);

export default router;
