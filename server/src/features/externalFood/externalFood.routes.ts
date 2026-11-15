import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate';
import { importRecipeSchema } from './externalFood.schema';
import * as externalFoodController from './externalFood.controller';

const router = Router();

router.use(protect);

router.get('/recipes', externalFoodController.getRecipes);
router.get('/foods', externalFoodController.getFoods);
router.post('/recipes/import', validateRequest(importRecipeSchema), externalFoodController.importRecipe);

export default router;
