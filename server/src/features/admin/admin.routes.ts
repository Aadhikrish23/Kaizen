import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { adminOnly } from '../../middleware/admin.middleware';
import { adminLimiter } from '../../middleware/adminRateLimit';
import { validateRequest } from '../../middleware/validate';
import * as c from './admin.controller';
import { createFoodSchema, foodIdSchema, listFoodsSchema, listUsersSchema, updateFoodSchema, updateUserSchema } from './admin.schema';

const router = Router();

// Order matters: authenticate (401), then require the admin role (403), then rate limit per admin
router.use(protect);
router.use(adminOnly);
router.use(adminLimiter);

router.get('/stats', c.stats);
router.get('/users', validateRequest(listUsersSchema), c.users);
router.patch('/users/:id', validateRequest(updateUserSchema), c.patchUser);

router.get('/foods', validateRequest(listFoodsSchema), c.foods);
router.post('/foods', validateRequest(createFoodSchema), c.postFood);
router.patch('/foods/:id', validateRequest(updateFoodSchema), c.patchFood);
router.delete('/foods/:id', validateRequest(foodIdSchema), c.removeFood);

export default router;
