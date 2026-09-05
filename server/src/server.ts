import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';

// 1. Load environment variables
dotenv.config();

// 2. Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

// 3. Connect to MongoDB
connectDB();

// 4. Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// 5. Feature Route Handlers
import waterRouter from './routes/water';
import mealsRouter from './routes/meals';
import weightRouter from './routes/weight';
import exercisesRouter from './routes/exercises';
import workoutsRouter from './routes/workouts';
import summaryRouter from './routes/summary';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import foodsRouter from './routes/foods';
import recipesRouter from './routes/recipes';
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
app.use('/api/v1/water', waterRouter);
app.use('/api/v1/meals', mealsRouter);
app.use('/api/v1/weight', weightRouter);
app.use('/api/v1/exercises', exercisesRouter);
app.use('/api/v1/workouts', workoutsRouter);
app.use('/api/v1/summary', summaryRouter);

// Health Check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      app: 'Kaizen API Server',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  });
});

import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

// 6. Start listener
app.listen(PORT, () => {
  console.log(`[Kaizen Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

export default app;
