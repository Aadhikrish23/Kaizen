import { Router, Request, Response } from 'express';
import Exercise from '../models/Exercise';

const router = Router();

// GET: /api/v1/exercises
router.get('/', async (req: Request, res: Response) => {
  try {
    const { muscle } = req.query;
    const filter = muscle ? { targetMuscle: String(muscle) } : {};
    const exercises = await Exercise.find(filter).sort({ name: 1 });
    return res.json({
      success: true,
      data: exercises
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

// POST: /api/v1/exercises
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, targetMuscle, equipment, secondaryMuscles, instructions } = req.body;
    if (!name || !targetMuscle) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name and targetMuscle are required' }
      });
    }

    const exercise = new Exercise({
      name,
      targetMuscle,
      equipment: equipment || 'dumbbell',
      secondaryMuscles: secondaryMuscles || [],
      instructions
    });
    await exercise.save();

    return res.status(201).json({
      success: true,
      data: exercise
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

// DELETE: /api/v1/exercises/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Exercise.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exercise not found' }
      });
    }
    return res.json({
      success: true,
      data: { id, deleted }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

export default router;
