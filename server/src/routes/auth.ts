import { Router } from 'express';
import { validateRequest } from '../middleware/validate';
import { registerSchema, loginSchema, resetPasswordSchema } from '../schemas/auth.schema';
import * as authController from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', validateRequest(resetPasswordSchema), authController.forgotPassword);
router.get('/me', protect, authController.getMe);

export default router;
