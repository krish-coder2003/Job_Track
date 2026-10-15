import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[JobTrack Server] Running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
    console.log(`[JobTrack Server] Health check available at: http://localhost:${PORT}/api/health`);
  });

  const shutdown = () => {
    console.log('\n[JobTrack Server] Gracefully shutting down...');
    server.close(() => {
      console.log('[JobTrack Server] Closed active connections. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer().catch((error) => {
  console.error('[JobTrack Server] Fatal startup error:', error);
  process.exit(1);
});
