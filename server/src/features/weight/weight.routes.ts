import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import { getDailyWeightSchema, upsertWeightSchema, deleteWeightSchema } from './weight.schema';
import * as weightController from './weight.controller';

const router = Router();

router.get('/history', protect, weightController.getHistory);
router.get('/', protect, validateRequest(getDailyWeightSchema), weightController.getDailyLog);
router.post('/', protect, validateRequest(upsertWeightSchema), weightController.upsertWeightLog);
router.delete('/:id', protect, validateRequest(deleteWeightSchema), weightController.deleteWeightLog);

export default router;
