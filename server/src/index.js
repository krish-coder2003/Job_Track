import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;
let server = null;
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[JobTrack Server] Received ${signal}. Starting graceful shutdown...`);

  // Force shutdown timer if graceful exit hangs
  const forceExitTimer = setTimeout(() => {
    console.error('[JobTrack Server] Shutdown timed out (10s). Forcing process exit.');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    // 1. Stop accepting new HTTP requests if server is active
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          console.log('[JobTrack Server] HTTP server closed. No longer accepting requests.');
          resolve();
        });
      });
    }

    // 2. Disconnect Mongoose / MongoDB
    await disconnectDB();

    console.log('[JobTrack Server] Graceful shutdown completed cleanly. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('[JobTrack Server] Error during graceful shutdown:', error.message);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    // 1. Connect to MongoDB first
    console.log('[JobTrack Server] Connecting to MongoDB...');
    await connectDB();

    // 2. Start listening for requests ONLY after successful database connection
    server = app.listen(PORT, () => {
      console.log(
        `[JobTrack Server] Running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`
      );
      console.log(`[JobTrack Server] Health check available at: http://localhost:${PORT}/api/health`);
    });

    server.on('error', (err) => {
      console.error(`[JobTrack Server] Server listening error: ${err.message}`);
      process.exit(1);
    });

    // 3. Register termination signals for graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('[JobTrack Server] Fatal startup error. Server aborted:', error.message);
    process.exit(1);
  }
};

startServer();

