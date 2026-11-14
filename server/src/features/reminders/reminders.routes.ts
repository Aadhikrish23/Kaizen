import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import * as controller from './reminders.controller';
import { putRemindersSchema } from './reminders.schema';

const router = Router();
router.use(protect);

router.get('/', controller.getReminders);
router.put('/', validateRequest(putRemindersSchema), controller.putReminders);
router.get('/due', controller.getDueReminders);

export default router;
