import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import { report } from './reports.controller';
import { reportsSchema } from './reports.schema';

const router = Router();
router.get('/', protect, validateRequest(reportsSchema), report);

export default router;
