import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { getProgress } from './gamification.controller';

const router = Router();
router.get('/', protect, getProgress);

export default router;
