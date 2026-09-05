import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate';
import { updateProfileSchema, completeOnboardingSchema } from '../schemas/profile.schema';
import * as profileController from '../controllers/profile.controller';

const router = Router();

router.get('/', protect, profileController.getProfile);
router.patch('/', protect, validateRequest(updateProfileSchema), profileController.updateProfile);
router.post('/onboarding', protect, validateRequest(completeOnboardingSchema), profileController.completeOnboarding);
router.post('/tdee', protect, profileController.computeTDEE);

export default router;
