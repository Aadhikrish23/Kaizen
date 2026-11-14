import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import * as searchController from './search.controller';
import { searchSchema } from './search.schema';

const router = Router();
router.get('/', protect, validateRequest(searchSchema), searchController.globalSearch);

export default router;
