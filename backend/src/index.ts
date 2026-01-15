import app from './app';
import { config, KAFKA_TOPICS } from './config';
import { kafkaClient } from './kafka/client';
import { createHandlersMap } from './kafka/handlers';
import { postgresClient } from './database/postgres';
import { redisClient } from './database/redis';

async function startServer(): Promise<void> {
  try {
    console.log('Starting Food Delivery Backend...');

    // Test PostgreSQL connection
    const pgHealthy = await postgresClient.healthCheck();
    if (pgHealthy) {
      console.log('✓ PostgreSQL connected');
    } else {
      console.warn('⚠ PostgreSQL not connected - some features may not work');
    }

    // Test Redis connection
    const redisHealthy = await redisClient.healthCheck();
    if (redisHealthy) {
      console.log('✓ Redis connected');
    } else {
      console.warn('⚠ Redis not connected - some features may not work');
    }

    // Connect to Kafka
    try {
      await kafkaClient.connect();
      console.log('✓ Kafka connected');

      // Subscribe to all topics
      const topics = Object.values(KAFKA_TOPICS);
      await kafkaClient.subscribe(topics);
      console.log('✓ Subscribed to Kafka topics');

      // Start consuming messages
      const handlers = createHandlersMap();
      await kafkaClient.startConsuming(handlers);
      console.log('✓ Kafka consumer started');
    } catch (kafkaError) {
      console.warn('⚠ Kafka not connected - event processing disabled');
      console.warn('  Make sure Kafka is running: docker-compose up -d kafka');
    }

    // Start Express server
    const server = app.listen(config.server.port, () => {
      console.log(`\n🚀 Server running on http://localhost:${config.server.port}`);
      console.log('\nAvailable endpoints:');
      console.log(`  GET  /                    - API info`);
      console.log(`  GET  /api/health          - Health check`);
      console.log(`  POST /api/orders          - Create order`);
      console.log(`  GET  /api/orders/:id      - Get order`);
      console.log(`  GET  /api/orders/:id/status - Get live order status`);
      console.log(`  POST /api/orders/:id/ready  - Mark order ready`);
      console.log(`  POST /api/riders          - Create rider`);
      console.log(`  GET  /api/riders          - List riders`);
      console.log(`  POST /api/riders/:id/online  - Rider goes online`);
      console.log(`  POST /api/riders/:id/offline - Rider goes offline`);
      console.log(`  POST /api/riders/:id/location - Update rider location`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          await kafkaClient.disconnect();
          console.log('Kafka disconnected');
        } catch (e) {
          // Ignore kafka disconnect errors
        }

        await redisClient.close();
        console.log('Redis disconnected');

        await postgresClient.close();
        console.log('PostgreSQL disconnected');

        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
