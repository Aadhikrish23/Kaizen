import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate';
import { configurePlanSchema, adaptPlanSchema, activateDaySchema, swapExerciseSchema } from '../schemas/planner.schema';
import * as plannerController from '../controllers/planner.controller';

const router = Router();

router.get('/', protect, plannerController.getPlan);
router.post('/configure', protect, validateRequest(configurePlanSchema), plannerController.configurePlan);
router.post('/adapt', protect, validateRequest(adaptPlanSchema), plannerController.adaptPlan);
router.post('/activate', protect, validateRequest(activateDaySchema), plannerController.activateDay);
router.post('/swap', protect, validateRequest(swapExerciseSchema), plannerController.swapExercise);

export default router;
