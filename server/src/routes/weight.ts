import { Router, Request, Response } from 'express';
import WeightLog from '../models/WeightLog';

const router = Router();

// GET: /api/v1/weight (full history, sorted by date asc)
router.get('/', async (req: Request, res: Response) => {
  try {
    const history = await WeightLog.find().sort({ date: 1 });
    return res.json({
      success: true,
      data: history
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

// GET: /api/v1/weight/daily?date=YYYY-MM-DD
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Date parameter is required' }
      });
    }

    const log = await WeightLog.findOne({ date: String(date) });
    return res.json({
      success: true,
      data: log
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

// POST: /api/v1/weight (upsert by date)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { weight, date, notes } = req.body;
    if (!weight || !date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Weight and date are required' }
      });
    }

    const updated = await WeightLog.findOneAndUpdate(
      { date: String(date) },
      { weight: Number(weight), notes: notes || '' },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

// DELETE: /api/v1/weight/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await WeightLog.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Weight log not found' }
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
