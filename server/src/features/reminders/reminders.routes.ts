import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import { remindersIpLimiter, remindersUserLimiter } from '../../middleware/remindersRateLimit';
import * as controller from './reminders.controller';
import { putRemindersSchema } from './reminders.schema';

const router = Router();
// Own limits instead of the shared global IP limiter (which skips this router):
//  1. a generous IP ceiling before auth, so unauthenticated floods are still bounded;
//  2. a per-user limit after auth, sized for several open tabs polling once a minute.
router.use(remindersIpLimiter);
router.use(protect);
router.use(remindersUserLimiter);

router.get('/', controller.getReminders);
router.put('/', validateRequest(putRemindersSchema), controller.putReminders);
router.get('/due', controller.getDueReminders);

export default router;
