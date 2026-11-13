import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import { getWaterLogsSchema, createWaterLogSchema, deleteWaterLogSchema } from './water.schema';
import * as waterController from './water.controller';

const router = Router();

router.get('/', protect, validateRequest(getWaterLogsSchema), waterController.getWaterLogs);
router.post('/', protect, validateRequest(createWaterLogSchema), waterController.createWaterLog);
router.delete('/:id', protect, validateRequest(deleteWaterLogSchema), waterController.deleteWaterLog);

export default router;