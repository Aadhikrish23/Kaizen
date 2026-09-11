import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import * as externalFoodController from '../controllers/externalFood.controller';

const router = Router();

router.use(protect);

router.get('/recipes', externalFoodController.getRecipes);
router.get('/foods', externalFoodController.getFoods);
router.post('/recipes/import', externalFoodController.importRecipe);

export default router;
