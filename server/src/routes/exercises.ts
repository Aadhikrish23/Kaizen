import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate';
import { getExercisesSchema, createExerciseSchema, deleteExerciseSchema } from '../schemas/exercise.schema';
import * as exerciseController from '../controllers/exercise.controller';

const router = Router();

router.get('/', protect, validateRequest(getExercisesSchema), exerciseController.getExercises);
router.post('/', protect, validateRequest(createExerciseSchema), exerciseController.createExercise);
router.delete('/:id', protect, validateRequest(deleteExerciseSchema), exerciseController.deleteExercise);

export default router;