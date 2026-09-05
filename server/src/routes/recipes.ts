import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate';
import { createRecipeSchema, updateRecipeSchema } from '../schemas/recipe.schema';
import * as recipeController from '../controllers/recipe.controller';

const router = Router();

router.use(protect); // All recipe routes protected

router.route('/')
  .get(recipeController.getRecipes)
  .post(validateRequest(createRecipeSchema), recipeController.createRecipe);

router.route('/:id')
  .get(recipeController.getRecipeById)
  .patch(validateRequest(updateRecipeSchema), recipeController.updateRecipe)
  .delete(recipeController.deleteRecipe);

export default router;
