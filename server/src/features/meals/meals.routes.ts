import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import { getMealLogsSchema, createMealLogSchema, deleteMealLogSchema } from './meal.schema';
import * as mealController from './meal.controller';

const router = Router();

router.get('/', protect, validateRequest(getMealLogsSchema), mealController.getMealLogs);
router.post('/', protect, validateRequest(createMealLogSchema), mealController.createMealLog);
router.delete('/:id', protect, validateRequest(deleteMealLogSchema), mealController.deleteMealLog);

export default router;