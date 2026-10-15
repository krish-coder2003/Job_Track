import { getDBStatus } from '../config/db.js';

export const getHealthStatus = (req, res) => {
  const dbStatus = getDBStatus();
  
  res.status(200).json({
    status: 'ok',
    service: 'JobTrack API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      healthy: dbStatus === 'connected',
    },
  });
};
