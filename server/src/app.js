import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import healthRoutes from './routes/health.routes.js';

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

// Health check endpoint
app.use('/api/health', healthRoutes);

// 404 Not Found handler
app.use((req, res, _next) => {
  res.status(404).json({
    error: 'Route Not Found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

export default app;
