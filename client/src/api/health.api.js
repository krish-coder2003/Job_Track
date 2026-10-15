import api from './axios';

/**
 * Fetch backend system health status
 * GET /api/health
 */
export const checkHealth = async () => {
  const startTime = performance.now();
  const response = await api.get('/health');
  const latency = Math.round(performance.now() - startTime);
  return {
    ...response.data,
    latency,
  };
};
