import { Router, Request, Response } from 'express';
import WaterLog from '../models/WaterLog';

const router = Router();

// GET: /api/v1/water?date=YYYY-MM-DD
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Query parameter date (YYYY-MM-DD) is required' }
      });
    }

    const logs = await WaterLog.find({ date: String(date) }).sort({ createdAt: 1 });
    const totalAmount = logs.reduce((sum, item) => sum + item.amount, 0);

    return res.json({
      success: true,
      data: {
        date: String(date),
        totalAmount,
        logs
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (err as Error).message }
    });
  }
});

// POST: /api/v1/water
router.post('/', async (req: Request, res: Response) => {
  try {
    const { amount, time, date } = req.body;
    if (!amount || !time || !date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Fields amount, time, and date are required' }
      });
    }

    const log = new WaterLog({ amount: Number(amount), time, date });
    await log.save();

    return res.status(201).json({
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

// DELETE: /api/v1/water/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await WaterLog.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Water log entry not found' }
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
