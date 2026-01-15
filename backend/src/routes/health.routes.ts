import { Router, Request, Response } from 'express';
import { postgresClient } from '../database/postgres';
import { redisClient } from '../database/redis';
import { kafkaClient } from '../kafka/client';

const router = Router();

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const postgresHealth = await postgresClient.healthCheck();
    const redisHealth = await redisClient.healthCheck();
    const kafkaHealth = await kafkaClient.healthCheck();

    const isHealthy = postgresHealth && redisHealth && kafkaHealth;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        postgres: postgresHealth ? 'connected' : 'disconnected',
        redis: redisHealth ? 'connected' : 'disconnected',
        kafka: kafkaHealth ? 'connected' : 'disconnected',
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Readiness check
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const postgresHealth = await postgresClient.healthCheck();
    const redisHealth = await redisClient.healthCheck();

    if (postgresHealth && redisHealth) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

// Liveness check
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

export default router;
