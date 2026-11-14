import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { connectDB } from './config/db';
import { assertSecretsConfigured } from './config/secrets';

// 1. Load environment variables
dotenv.config();

// 2. Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

// 3. Validate secrets, then connect to MongoDB
assertSecretsConfigured();
connectDB();

// 4. Middlewares
app.use(helmet());
app.use(compression());
app.use(mongoSanitize());

// Public health check: mounted before the rate limiter and auth so probes are never blocked.
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { status: 'ok', db: mongoose.connection.readyState === 1 ? 'up' : 'down' }
  });
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// 5. Feature Route Handlers
import waterRouter from './features/water/water.routes';
import mealsRouter from './features/meals/meals.routes';
import weightRouter from './features/weight/weight.routes';
import exercisesRouter from './features/exercises/exercises.routes';
import workoutsRouter from './features/workouts/workouts.routes';
import summaryRouter from './features/summary/summary.routes';
import authRouter from './features/auth/auth.routes';
import profileRouter from './features/profile/profile.routes';
import foodsRouter from './features/foods/foods.routes';
import recipesRouter from './features/recipes/recipes.routes';
import measurementsRouter from './features/measurements/measurements.routes';
import routinesRouter from './features/routines/routines.routes';
import inventoryRouter from './features/inventory/inventory.routes';
import plannerRouter from './features/planner/planner.routes';
import sleepRouter from './features/sleep/sleep.routes';
import analyticsRouter from './features/analytics/analytics.routes';
import aiRouter from './features/ai/ai.routes';
import searchRouter from './features/search/search.routes';
import remindersRouter from './features/reminders/reminders.routes';
import externalFoodRouter from './features/externalFood/externalFood.routes';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

app.use(cookieParser());

const swaggerDocument = YAML.load(path.join(__dirname, 'docs', 'swagger.yml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/foods', foodsRouter);
app.use('/api/v1/recipes', recipesRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/reminders', remindersRouter);
app.use('/api/v1/external', externalFoodRouter);
app.use('/api/v1/water', waterRouter);
app.use('/api/v1/meals', mealsRouter);
app.use('/api/v1/weight', weightRouter);
app.use('/api/v1/exercises', exercisesRouter);
app.use('/api/v1/workouts', workoutsRouter);
app.use('/api/v1/summary', summaryRouter);
app.use('/api/v1/measurements', measurementsRouter);
app.use('/api/v1/routines', routinesRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/planner', plannerRouter);
app.use('/api/v1/sleep', sleepRouter);

import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

// 6. Start listener
app.listen(PORT, () => {
  console.log(`[Kaizen Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

export default app;
