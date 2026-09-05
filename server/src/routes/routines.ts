import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate';
import { workoutRoutineSchema } from '../schemas/routine.schema';
import {
  createRoutineHandler,
  getRoutinesHandler,
  getRoutineByIdHandler,
  updateRoutineHandler,
  deleteRoutineHandler
} from '../controllers/routine.controller';

const router = Router();

router.use(protect);

router.route('/')
  .get(getRoutinesHandler)
  .post(validateRequest(workoutRoutineSchema), createRoutineHandler);

router.route('/:id')
  .get(getRoutineByIdHandler)
  .put(validateRequest(workoutRoutineSchema), updateRoutineHandler)
  .delete(deleteRoutineHandler);

export default router;
