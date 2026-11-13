import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import { updateInventorySchema, recordWorkingWeightSchema } from './inventory.schema';
import * as inventoryController from './inventory.controller';

const router = Router();

router.get('/', protect, inventoryController.getInventory);
router.post('/', protect, validateRequest(updateInventorySchema), inventoryController.updateInventory);
router.post('/working-weight', protect, validateRequest(recordWorkingWeightSchema), inventoryController.recordWorkingWeight);

export default router;
