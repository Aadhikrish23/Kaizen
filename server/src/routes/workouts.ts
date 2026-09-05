import { Router, Request, Response } from 'express';
import WorkoutLog from '../models/WorkoutLog';

const router = Router();

// Standard 4-day PPL+Arms default split logic for the split banner
const DEFAULT_SPLITS = [
  { dayIndex: 1, splitName: 'Push Day', muscles: ['chest', 'shoulders', 'triceps'] },
  { dayIndex: 2, splitName: 'Pull Day', muscles: ['back', 'biceps', 'rear delts'] },
  { dayIndex: 3, splitName: 'Legs & Core', muscles: ['quads', 'hamstrings', 'calves', 'abs'] },
  { dayIndex: 4, splitName: 'Upper Focus & Arms', muscles: ['arms', 'chest', 'back'] },
  { dayIndex: 5, splitName: 'Push & Core', muscles: ['chest', 'shoulders', 'core'] },
  { dayIndex: 6, splitName: 'Pull & Legs', muscles: ['back', 'legs'] },
  { dayIndex: 0, splitName: 'Active Recovery / Rest', muscles: [] } // Sunday
];

// GET: /api/v1/workouts/split/schedule (Today's focus and Tomorrow's preview)
router.get('/split/schedule', (req: Request, res: Response) => {
  const today = new Date();
  const todayDay = today.getDay(); // 0-6
  const tomorrowDay = (todayDay + 1) % 7;

  const todaySplit = DEFAULT_SPLITS.find(s => s.dayIndex === todayDay) || DEFAULT_SPLITS[0];
  const tomorrowSplit = DEFAULT_SPLITS.find(s => s.dayIndex === tomorrowDay) || DEFAULT_SPLITS[1];

  return res.json({
    success: true,
    data: {
      today: {
        splitName: todaySplit.splitName,
        targetMuscles: todaySplit.muscles,
        status: todaySplit.muscles.length > 0 ? 'active' : 'rest'
      },
      tomorrow: {
        splitName: tomorrowSplit.splitName,
        targetMuscles: tomorrowSplit.muscles,
        status: tomorrowSplit.muscles.length > 0 ? 'upcoming' : 'rest'
      }
    }
  });
});

// GET: /api/v1/workouts?date=YYYY-MM-DD
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) {
      // Return recent 10 workouts if no date provided
      const recent = await WorkoutLog.find().sort({ date: -1 }).limit(10);
      return res.json({
        success: true,
        data: recent
      });
    }

    const workout = await WorkoutLog.findOne({ date: String(date) });
    return res.json({
      success: true,
      data: workout
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

// POST: /api/v1/workouts
router.post('/', async (req: Request, res: Response) => {
  try {
    const { date, splitName, muscleGroups, exercises, durationMinutes, notes } = req.body;
    if (!date || !splitName || !exercises) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Fields date, splitName, and exercises are required' }
      });
    }

    // Check if session for date exists; if so, update; otherwise create
    let workout = await WorkoutLog.findOne({ date: String(date) });
    if (workout) {
      workout.splitName = splitName;
      workout.muscleGroups = muscleGroups || workout.muscleGroups;
      workout.exercises = exercises;
      workout.durationMinutes = durationMinutes;
      workout.notes = notes;
      await workout.save();
    } else {
      workout = new WorkoutLog({
        date,
        splitName,
        muscleGroups: muscleGroups || [],
        exercises,
        durationMinutes,
        notes
      });
      await workout.save();
    }

    return res.status(201).json({
      success: true,
      data: workout
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

// DELETE: /api/v1/workouts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await WorkoutLog.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workout log not found' }
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
