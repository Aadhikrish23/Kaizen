// Builds the OpenAPI 3.1 document served at /api-docs. Request schemas are derived from the zod schemas the routes
// actually validate with (z.toJSONSchema), so they cannot drift. `npm run docs:generate` writes src/docs/swagger.yml;
// test/openapi.test.ts fails if the committed file is stale or a route is missing from the document.
import { z } from 'zod';
import { parseFoodSchema, recommendationsSchema, chatSchema } from '../features/ai/ai.schema';
import { registerSchema, loginSchema, resetPasswordSchema } from '../features/auth/auth.schema';
import { getExercisesSchema, createExerciseSchema } from '../features/exercises/exercise.schema';
import { externalRecipesQuerySchema, externalFoodsQuerySchema, importRecipeSchema } from '../features/externalFood/externalFood.schema';
import { createFoodSchema as createCustomFoodSchema, searchFoodSchema } from '../features/foods/food.schema';
import { updateInventorySchema, recordWorkingWeightSchema } from '../features/inventory/inventory.schema';
import { createFoodSchema as createAdminFoodSchema, listFoodsSchema, listUsersSchema, updateFoodSchema, updateUserSchema, foodIdSchema } from '../features/admin/admin.schema';
import { getMealLogsSchema, createMealLogSchema } from '../features/meals/meal.schema';
import { measurementLogSchema } from '../features/measurements/measurement.schema';
import {
  configurePlanSchema, adaptPlanSchema, activateDaySchema, swapExerciseSchema, saveCustomPlanSchema, addExerciseToDaySchema, removeExerciseFromDaySchema,
} from '../features/planner/planner.schema';
import { updateProfileSchema, completeOnboardingSchema } from '../features/profile/profile.schema';
import { createRecipeSchema, updateRecipeSchema } from '../features/recipes/recipe.schema';
import { putRemindersSchema } from '../features/reminders/reminders.schema';
import { reportsSchema } from '../features/reports/reports.schema';
import { workoutRoutineSchema } from '../features/routines/routine.schema';
import { searchSchema } from '../features/search/search.schema';
import { upsertSleepSchema, getSleepByDateSchema } from '../features/sleep/sleep.schema';
import { getSummarySchema } from '../features/summary/summary.schema';
import { getWaterLogsSchema, createWaterLogSchema } from '../features/water/water.schema';
import { getDailyWeightSchema, upsertWeightSchema } from '../features/weight/weight.schema';
import { getWorkoutsSchema, createWorkoutSchema } from '../features/workouts/workout.schema';

type ZodReq = z.ZodObject<{ body?: any; query?: any; params?: any }>;

interface RouteDef {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string; // relative to /api/v1, OpenAPI style ({id})
  tag: string;
  summary: string;
  schema?: ZodReq; // the zod schema the route validates with
  /** Extra (non-zod) query parameters. */
  query?: Array<{ name: string; description: string; required?: boolean }>;
  body?: Record<string, unknown>; // hand-written JSON schema when there is no zod schema
  auth?: 'none' | 'user' | 'admin';
  status?: '200' | '201';
  limited?: boolean; // has a dedicated per-user rate limiter (documented in 429)
  notes?: string;
  /** Additional documented error responses, status code to description. */
  extraResponses?: Record<string, string>;
}

const toJson = (schema: z.ZodType): Record<string, any> => {
  const j: any = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  delete j.$schema;
  return j;
};

const R = (method: RouteDef['method'], path: string, tag: string, summary: string, rest: Partial<RouteDef> = {}): RouteDef =>
  ({ method, path, tag, summary, auth: 'user', ...rest });

export const ROUTES: RouteDef[] = [
  R('get', '/health', 'System', 'Liveness and database status', { auth: 'none', notes: 'Not rate limited. Returns {status:"ok", db:"up"|"down"}.' }),

  R('post', '/auth/register', 'Auth', 'Register a user (sets the refresh cookie)', { schema: registerSchema, auth: 'none', status: '201' }),
  R('post', '/auth/login', 'Auth', 'Log in (sets the refresh cookie)', { schema: loginSchema, auth: 'none' }),
  R('post', '/auth/refresh', 'Auth', 'Rotate the refresh token (cookie) and issue a new access token', { auth: 'none', notes: 'A refresh token can be used once; replays return 401.' }),
  R('post', '/auth/logout', 'Auth', 'Revoke the refresh token and clear the cookie', { auth: 'none' }),
  R('post', '/auth/forgot-password', 'Auth', 'Request a password reset (mock: logs the link)', { schema: resetPasswordSchema, auth: 'none' }),
  R('get', '/auth/me', 'Auth', 'The authenticated user'),

  R('get', '/profile', 'Profile', 'Profile and TDEE'),
  R('patch', '/profile', 'Profile', 'Update the profile (strict whitelist)', { schema: updateProfileSchema }),
  R('get', '/profile/goal-history', 'Profile', 'History of goal, target weight and target date changes'),
  R('get', '/profile/goal-progress', 'Profile', 'Progress and pace toward the goal'),
  R('post', '/profile/onboarding', 'Profile', 'Complete onboarding', { schema: completeOnboardingSchema }),
  R('post', '/profile/tdee', 'Profile', 'Compute TDEE for the given body data', { body: { type: 'object' } }),

  R('get', '/foods/search', 'Foods', 'Search global foods and your custom foods', { schema: searchFoodSchema }),
  R('post', '/foods', 'Foods', 'Create a custom food', { schema: createCustomFoodSchema, status: '201' }),
  R('delete', '/foods/{id}', 'Foods', 'Delete one of your custom foods'),

  R('get', '/recipes', 'Recipes', 'Your recipes'),
  R('post', '/recipes', 'Recipes', 'Create a recipe', { schema: createRecipeSchema, status: '201' }),
  R('get', '/recipes/{id}', 'Recipes', 'One of your recipes'),
  R('patch', '/recipes/{id}', 'Recipes', 'Update a recipe (strict body)', { schema: updateRecipeSchema }),
  R('delete', '/recipes/{id}', 'Recipes', 'Delete a recipe'),

  R('get', '/analytics', 'Analytics', 'Daily aggregates for a window ending today', { query: [{ name: 'days', description: 'Window length 1..365 (default 30)' }] }),
  R('get', '/summary', 'Summary', 'Everything logged for one date', { schema: getSummarySchema }),
  R('get', '/reports', 'Reports', 'Daily, weekly or monthly report (logged days only; states when data is insufficient)', { schema: reportsSchema }),
  R('get', '/gamification', 'Gamification', 'XP, level, streak and achievements'),

  R('post', '/ai/parse-food', 'AI', 'Parse free text into foods; nutrition comes from the food database', { schema: parseFoodSchema, limited: true }),
  R('get', '/ai/insights', 'AI', 'Daily insight (AI with heuristic fallback)', { query: [{ name: 'date', description: 'YYYY-MM-DD' }], limited: true }),
  R('get', '/ai/insight/weekly', 'AI', 'Weekly insight over the last 7 days', { limited: true }),
  R('get', '/ai/recommendations', 'AI', 'Meal suggestions that fit the remaining calories and protein (deterministic)', { schema: recommendationsSchema, limited: true }),
  R('post', '/ai/chat', 'AI', 'Coach chat', { schema: chatSchema, limited: true }),
  R('get', '/ai/search', 'Search', 'Grouped search over foods, recipes, exercises and routines', { schema: searchSchema, limited: true }),
  R('get', '/search', 'Search', 'Alias of /ai/search', { schema: searchSchema, limited: true }),

  R('get', '/external/recipes', 'External', 'Recipe search (Spoonacular, or your own recipes as fallback)', { schema: externalRecipesQuerySchema }),
  R('get', '/external/foods', 'External', 'Food search (local database, then Open Food Facts)', { schema: externalFoodsQuerySchema }),
  R('post', '/external/recipes/import', 'External', 'Import an external recipe into your recipes', { schema: importRecipeSchema, status: '201' }),

  R('get', '/reminders', 'Reminders', 'Reminder preferences (defaults when none saved)'),
  R('put', '/reminders', 'Reminders', 'Save reminder preferences', { schema: putRemindersSchema }),
  R('get', '/reminders/due', 'Reminders', 'Reminders due now (polled by the client)', { notes: 'Has its own rate limits instead of the shared global limiter.' }),

  R('get', '/water', 'Water', 'Water logs for a date', { schema: getWaterLogsSchema }),
  R('post', '/water', 'Water', 'Add a water log', { schema: createWaterLogSchema, status: '201' }),
  R('delete', '/water/{id}', 'Water', 'Delete a water log'),
  R('get', '/meals', 'Meals', 'Meal logs for a date', { schema: getMealLogsSchema }),
  R('post', '/meals', 'Meals', 'Add a meal log', { schema: createMealLogSchema, status: '201' }),
  R('delete', '/meals/{id}', 'Meals', 'Delete a meal log'),
  R('get', '/weight/history', 'Weight', 'All weigh-ins'),
  R('get', '/weight', 'Weight', 'Weigh-in for a date', { schema: getDailyWeightSchema }),
  R('post', '/weight', 'Weight', 'Create or update the weigh-in for a date', { schema: upsertWeightSchema }),
  R('delete', '/weight/{id}', 'Weight', 'Delete a weigh-in'),
  R('get', '/sleep/circadian', 'Sleep', 'Estimated bedtimes for a wake time', { query: [{ name: 'wakeTime', description: 'HH:MM' }] }),
  R('get', '/sleep/history', 'Sleep', 'Recent sleep logs', { query: [{ name: 'startDate', description: 'YYYY-MM-DD' }, { name: 'endDate', description: 'YYYY-MM-DD' }] }),
  R('get', '/sleep', 'Sleep', 'Sleep log for a date', { schema: getSleepByDateSchema }),
  R('post', '/sleep', 'Sleep', 'Create or update the sleep log for a date', { schema: upsertSleepSchema }),
  R('delete', '/sleep/{id}', 'Sleep', 'Delete a sleep log'),
  R('get', '/measurements', 'Measurements', 'Body measurements', { query: [{ name: 'startDate', description: 'YYYY-MM-DD' }, { name: 'endDate', description: 'YYYY-MM-DD' }] }),
  R('post', '/measurements', 'Measurements', 'Create or update the measurements for a date (strict body)', { schema: measurementLogSchema }),

  R('get', '/exercises', 'Exercises', 'Exercise catalog plus your custom exercises', { schema: getExercisesSchema }),
  R('post', '/exercises', 'Exercises', 'Create a custom exercise', { schema: createExerciseSchema, status: '201' }),
  R('delete', '/exercises/{id}', 'Exercises', 'Delete a custom exercise'),
  R('get', '/workouts/schedule', 'Workouts', 'Today and tomorrow in your split'),
  R('get', '/workouts/split/schedule', 'Workouts', 'Alias of /workouts/schedule'),
  R('get', '/workouts', 'Workouts', 'Workout logs', { schema: getWorkoutsSchema }),
  R('post', '/workouts', 'Workouts', 'Create or update the workout for a date', { schema: createWorkoutSchema }),
  R('delete', '/workouts/{id}', 'Workouts', 'Delete a workout log'),
  R('get', '/routines', 'Routines', 'Your routines'),
  R('post', '/routines', 'Routines', 'Create a routine (strict body)', { schema: workoutRoutineSchema, status: '201' }),
  R('get', '/routines/{id}', 'Routines', 'One routine'),
  R('put', '/routines/{id}', 'Routines', 'Update a routine (strict body)', { schema: workoutRoutineSchema }),
  R('delete', '/routines/{id}', 'Routines', 'Delete a routine'),
  R('get', '/inventory', 'Inventory', 'Equipment and working weights (needsSetup is true for new users)'),
  R('post', '/inventory', 'Inventory', 'Save equipment (an empty list is valid: bodyweight only)', { schema: updateInventorySchema }),
  R('post', '/inventory/working-weight', 'Inventory', 'Record a working weight', { schema: recordWorkingWeightSchema }),

  R('get', '/planner', 'Planner', 'Your workout plan (generated on first use)'),
  R('delete', '/planner', 'Planner', 'Delete your plan'),
  R('post', '/planner/configure', 'Planner', 'Generate a plan from preferences', { schema: configurePlanSchema }),
  R('put', '/planner/custom', 'Planner', 'Save a custom plan', { schema: saveCustomPlanSchema }),
  R('post', '/planner/exercise', 'Planner', 'Add an exercise to a day', { schema: addExerciseToDaySchema }),
  R('delete', '/planner/exercise', 'Planner', 'Remove an exercise from a day', { schema: removeExerciseFromDaySchema }),
  R('post', '/planner/adapt', 'Planner', 'Adapt the plan from the log of a date', { schema: adaptPlanSchema }),
  R('post', '/planner/activate', 'Planner', 'Load a planned day into a workout log (409 if sets were already completed)', { schema: activateDaySchema }),
  R('post', '/planner/swap', 'Planner', 'Swap an exercise (your own or catalog exercises only)', { schema: swapExerciseSchema }),

  R('get', '/admin/stats', 'Admin', 'Usage statistics', { auth: 'admin' }),
  R('get', '/admin/users', 'Admin', 'Paged users (public fields only)', { auth: 'admin', schema: listUsersSchema }),
  R('patch', '/admin/users/{id}', 'Admin', 'Change role and/or isActive', {
    auth: 'admin', schema: updateUserSchema,
    notes: 'An admin cannot demote or deactivate themselves (400 SELF_MODIFICATION_FORBIDDEN). The last remaining active admin cannot be demoted or deactivated (409 LAST_ADMIN). Deactivation revokes the user\'s refresh tokens.',
    extraResponses: { '409': 'The last remaining active admin cannot be demoted or deactivated (LAST_ADMIN)' },
  }),
  R('get', '/admin/foods', 'Admin', 'Paged global foods', { auth: 'admin', schema: listFoodsSchema }),
  R('post', '/admin/foods', 'Admin', 'Create a global food', { auth: 'admin', schema: createAdminFoodSchema, status: '201' }),
  R('patch', '/admin/foods/{id}', 'Admin', 'Update a global food', { auth: 'admin', schema: updateFoodSchema }),
  R('delete', '/admin/foods/{id}', 'Admin', 'Delete a global food', { auth: 'admin', schema: foodIdSchema }),
];

const errorRef = (description: string) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });

const buildOperation = (r: RouteDef) => {
  const shape: any = r.schema?.shape ?? {};
  const parameters: any[] = [];

  for (const p of [...r.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1])) {
    parameters.push({ name: p, in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } });
  }
  if (shape.query) {
    const q = toJson(shape.query);
    for (const [name, sch] of Object.entries<any>(q.properties ?? {})) {
      parameters.push({ name, in: 'query', required: (q.required ?? []).includes(name), schema: sch });
    }
  }
  for (const p of r.query ?? []) parameters.push({ name: p.name, in: 'query', required: !!p.required, description: p.description, schema: { type: 'string' } });

  const bodySchema = shape.body ? toJson(shape.body) : r.body;
  const validated = !!(shape.body || shape.query || r.body || (shape.params && r.schema));
  const op: any = { tags: [r.tag], summary: r.summary };
  if (r.notes) op.description = r.notes;
  if (parameters.length) op.parameters = parameters;
  if (bodySchema) op.requestBody = { required: true, content: { 'application/json': { schema: bodySchema } } };
  if (r.auth === 'none') op.security = [];

  const ok = r.status ?? '200';
  op.responses = {
    [ok]: { description: ok === '201' ? 'Created' : 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
  };
  if (validated) op.responses['400'] = errorRef('Validation error (VALIDATION_ERROR) with per-field details');
  if (r.auth !== 'none') op.responses['401'] = errorRef('Missing, invalid or expired access token, or a deactivated account');
  if (r.auth === 'admin') op.responses['403'] = errorRef('Not an admin (FORBIDDEN)');
  if (r.path.includes('{id}')) op.responses['404'] = errorRef('Not found (or not yours)');
  for (const [code, d] of Object.entries(r.extraResponses ?? {})) op.responses[code] = errorRef(d);
  op.responses['429'] = errorRef(
    r.limited ? 'Rate limit exceeded: per-user limit for this endpoint group (RATE_LIMITED)' : 'Rate limit exceeded (RATE_LIMITED): global per-IP limit'
  );
  return op;
};

export const buildOpenApi = () => {
  const paths: Record<string, any> = {};
  for (const r of ROUTES) {
    paths[r.path] = paths[r.path] ?? {};
    paths[r.path][r.method] = buildOperation(r);
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Kaizen API',
      version: '1.0.0',
      description:
        'All endpoints return JSON envelopes: {success: true, data} or {success: false, error: {code, message, details?}}. ' +
        'Authenticate with `Authorization: Bearer <accessToken>`; the refresh token lives in an httpOnly cookie. ' +
        'Requests are rate limited: a global per-IP limit (429 RATE_LIMITED) plus per-user limits on AI, reminders and admin routes.',
    },
    servers: [{ url: 'http://localhost:5000/api/v1' }],
    tags: [...new Set(ROUTES.map((r) => r.tag))].map((name) => ({ name })),
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Success: { type: 'object', required: ['success'], properties: { success: { const: true }, data: {} } },
        Error: {
          type: 'object', required: ['success', 'error'],
          properties: {
            success: { const: false },
            error: {
              type: 'object', required: ['code', 'message'],
              properties: {
                code: { type: 'string', examples: ['VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'RATE_LIMITED'] },
                message: { type: 'string' },
                details: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, message: { type: 'string' } } } },
              },
            },
          },
        },
      },
    },
    paths,
  };
};
