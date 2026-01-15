/**
 * End-to-End Tests for Health Check Endpoints
 *
 * Run with: npm run test:e2e
 */

import request from 'supertest';
import app from '../../src/app';

describe('E2E: Health Check Endpoints', () => {
  describe('GET /api/health', () => {
    it('Should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect((res) => {
          // Accept both 200 (healthy) and 503 (unhealthy)
          expect([200, 503]).toContain(res.status);
        });

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(['healthy', 'unhealthy']).toContain(response.body.status);
    });

    it('Should include service status details', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.services).toHaveProperty('postgres');
      expect(response.body.services).toHaveProperty('redis');
      expect(response.body.services).toHaveProperty('kafka');
    });
  });

  describe('GET /api/health/ready', () => {
    it('Should return readiness status', async () => {
      const response = await request(app)
        .get('/api/health/ready')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
        });

      expect(response.body).toHaveProperty('status');
      expect(['ready', 'not ready']).toContain(response.body.status);
    });
  });

  describe('GET /api/health/live', () => {
    it('Should always return alive status', async () => {
      const response = await request(app)
        .get('/api/health/live')
        .expect(200);

      expect(response.body.status).toBe('alive');
    });
  });

  describe('GET /', () => {
    it('Should return API info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.name).toBe('Food Delivery Backend API');
    });
  });

  describe('404 Not Found', () => {
    it('Should return 404 for non-existent endpoint', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Not Found');
    });
  });
});
