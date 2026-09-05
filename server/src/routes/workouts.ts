import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate';
import { getWorkoutsSchema, createWorkoutSchema, deleteWorkoutSchema } from '../schemas/workout.schema';
import * as workoutController from '../controllers/workout.controller';

const router = Router();

router.get('/schedule', protect, workoutController.getSchedule);
router.get('/', protect, validateRequest(getWorkoutsSchema), workoutController.getWorkouts);
router.post('/', protect, validateRequest(createWorkoutSchema), workoutController.createWorkout);
router.delete('/:id', protect, validateRequest(deleteWorkoutSchema), workoutController.deleteWorkout);

export default router;