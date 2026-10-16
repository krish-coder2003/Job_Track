import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import jobRoutes from './routes/job.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to JobTrack API',
    documentation: '/api/health',
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/health', healthRoutes);

// 404 Not Found handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
