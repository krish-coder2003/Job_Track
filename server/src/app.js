import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import jobRoutes from './routes/job.routes.js';
import userRoutes from './routes/user.routes.js';
import applicationRoutes from './routes/application.routes.js';
import adminRoutes from './routes/admin.routes.js';
import atsJobRoutes from './routes/ats.job.routes.js';
import atsApplicationRoutes from './routes/ats.application.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import securityHeaders from './middlewares/security.middleware.js';
import { globalRateLimiter, authRateLimiter } from './middlewares/rateLimit.middleware.js';

const app = express();

// Security Headers (OWASP recommendations)
app.use(securityHeaders);

// CORS Configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Global Rate Limiting
app.use(globalRateLimiter);

// Request body limits to prevent Denial-of-Service / Memory Exhaustion
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
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
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/jobs', atsJobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/applications', atsApplicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);

// 404 Not Found handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
