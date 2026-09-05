import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate';
import { searchFoodSchema, createFoodSchema } from '../schemas/food.schema';
import * as foodController from '../controllers/food.controller';

const router = Router();

router.get('/search', protect, validateRequest(searchFoodSchema), foodController.searchFoods);
router.post('/', protect, validateRequest(createFoodSchema), foodController.createFood);
router.delete('/:id', protect, foodController.deleteFood);

export default router;
