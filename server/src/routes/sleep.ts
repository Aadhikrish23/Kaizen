import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate';
import {
  upsertSleepSchema,
  getSleepByDateSchema,
  deleteSleepSchema
} from '../schemas/sleep.schema';
import {
  getSleepLog,
  getSleepHistory,
  upsertSleepLog,
  deleteSleepLog,
  getCircadianWindows
} from '../controllers/sleep.controller';

const router = Router();

router.use(protect);

router.get('/circadian', getCircadianWindows);
router.get('/history', getSleepHistory);

router.route('/')
  .get(validateRequest(getSleepByDateSchema), getSleepLog)
  .post(validateRequest(upsertSleepSchema), upsertSleepLog);

router.delete('/:id', validateRequest(deleteSleepSchema), deleteSleepLog);

export default router;
