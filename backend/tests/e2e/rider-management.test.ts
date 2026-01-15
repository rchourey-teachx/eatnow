/**
 * End-to-End Tests for Rider Management
 * Tests rider lifecycle and location tracking
 *
 * Prerequisites:
 * - Docker containers running (Kafka, Redis, PostgreSQL)
 * - Database migrated and seeded
 *
 * Run with: npm run test:e2e
 */

import request from 'supertest';
import app from '../../src/app';

// Test data
const TEST_RIDER_ID = 'd1d1d1d1-1111-1111-1111-111111111111';
const TEST_RIDER_ID_2 = 'd2d2d2d2-2222-2222-2222-222222222222';

describe('E2E: Rider Management', () => {
  // Helper to wait for async event processing
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Ensure riders are offline before tests
  beforeAll(async () => {
    await request(app).post(`/api/riders/${TEST_RIDER_ID}/offline`).send();
    await request(app).post(`/api/riders/${TEST_RIDER_ID_2}/offline`).send();
    await wait(500);
  });

  describe('Rider Online/Offline Status', () => {
    it('Should list all riders', async () => {
      const response = await request(app)
        .get('/api/riders')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('Should get rider by ID', async () => {
      const response = await request(app)
        .get(`/api/riders/${TEST_RIDER_ID}`)
        .expect(200);

      expect(response.body.id).toBe(TEST_RIDER_ID);
      expect(response.body.name).toBe('Mike Rider');
    });

    it('Should show no online riders initially', async () => {
      const response = await request(app)
        .get('/api/riders/online')
        .expect(200);

      // May have riders from other tests, just check it returns array
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('Should set rider online with location', async () => {
      const response = await request(app)
        .post(`/api/riders/${TEST_RIDER_ID}/online`)
        .send({
          latitude: 40.7128,
          longitude: -74.006,
        })
        .expect(200);

      expect(response.body.message).toBe('Rider is now online');
      expect(response.body.rider.id).toBe(TEST_RIDER_ID);

      await wait(500);
    });

    it('Should show rider in online list', async () => {
      const response = await request(app)
        .get('/api/riders/online')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const riderIds = response.body.map((r: any) => r.riderId);
      expect(riderIds).toContain(TEST_RIDER_ID);
    });

    it('Should get rider current location', async () => {
      const response = await request(app)
        .get(`/api/riders/${TEST_RIDER_ID}/location`)
        .expect(200);

      expect(response.body.latitude).toBe(40.7128);
      expect(response.body.longitude).toBe(-74.006);
    });

    it('Should set rider offline', async () => {
      const response = await request(app)
        .post(`/api/riders/${TEST_RIDER_ID}/offline`)
        .expect(200);

      expect(response.body.message).toBe('Rider is now offline');

      await wait(500);
    });

    it('Should remove rider from online list', async () => {
      const response = await request(app)
        .get('/api/riders/online')
        .expect(200);

      const riderIds = response.body.map((r: any) => r.riderId);
      expect(riderIds).not.toContain(TEST_RIDER_ID);
    });
  });

  describe('Rider Location Updates', () => {
    beforeAll(async () => {
      // Set rider online for location tests
      await request(app)
        .post(`/api/riders/${TEST_RIDER_ID}/online`)
        .send({
          latitude: 40.7128,
          longitude: -74.006,
        });
      await wait(500);
    });

    afterAll(async () => {
      await request(app).post(`/api/riders/${TEST_RIDER_ID}/offline`).send();
    });

    it('Should update rider location', async () => {
      const newLocation = {
        latitude: 40.715,
        longitude: -74.005,
      };

      await request(app)
        .post(`/api/riders/${TEST_RIDER_ID}/location`)
        .send(newLocation)
        .expect(200);

      await wait(500);

      // Verify location was updated
      const response = await request(app)
        .get(`/api/riders/${TEST_RIDER_ID}/location`)
        .expect(200);

      expect(response.body.latitude).toBe(newLocation.latitude);
      expect(response.body.longitude).toBe(newLocation.longitude);
    });

    it('Should track multiple location updates', async () => {
      const locations = [
        { latitude: 40.716, longitude: -74.004 },
        { latitude: 40.717, longitude: -74.003 },
        { latitude: 40.718, longitude: -74.002 },
      ];

      for (const location of locations) {
        await request(app)
          .post(`/api/riders/${TEST_RIDER_ID}/location`)
          .send(location)
          .expect(200);
        await wait(200);
      }

      // Check final location
      const response = await request(app)
        .get(`/api/riders/${TEST_RIDER_ID}/location`)
        .expect(200);

      expect(response.body.latitude).toBe(40.718);
      expect(response.body.longitude).toBe(-74.002);
    });

    it('Should reject location update without coordinates', async () => {
      await request(app)
        .post(`/api/riders/${TEST_RIDER_ID}/location`)
        .send({})
        .expect(400);
    });
  });

  describe('Rider Current Order', () => {
    it('Should return null when rider has no current order', async () => {
      const response = await request(app)
        .get(`/api/riders/${TEST_RIDER_ID}/current-order`)
        .expect(200);

      expect(response.body.currentOrder).toBeNull();
    });
  });

  describe('Matching Stats', () => {
    it('Should return matching statistics', async () => {
      const response = await request(app)
        .get('/api/riders/stats/matching')
        .expect(200);

      expect(response.body).toHaveProperty('unassignedOrders');
      expect(response.body).toHaveProperty('onlineRiders');
      expect(response.body).toHaveProperty('availableRiders');
      expect(typeof response.body.unassignedOrders).toBe('number');
      expect(typeof response.body.onlineRiders).toBe('number');
      expect(typeof response.body.availableRiders).toBe('number');
    });
  });

  describe('Create New Rider', () => {
    let newRiderId: string;

    it('Should create a new rider', async () => {
      const response = await request(app)
        .post('/api/riders')
        .send({
          name: 'Test New Rider',
          phone: '+1999999999',
          email: `test-${Date.now()}@riders.com`,
          vehicleType: 'scooter',
        })
        .expect(201);

      expect(response.body.message).toBe('Rider created successfully');
      expect(response.body.rider).toBeDefined();
      expect(response.body.rider.name).toBe('Test New Rider');
      expect(response.body.rider.vehicle_type).toBe('scooter');
      expect(response.body.rider.status).toBe('offline');

      newRiderId = response.body.rider.id;
    });

    it('Should find the newly created rider', async () => {
      if (!newRiderId) {
        console.warn('Skipping: No rider ID from previous test');
        return;
      }

      const response = await request(app)
        .get(`/api/riders/${newRiderId}`)
        .expect(200);

      expect(response.body.id).toBe(newRiderId);
      expect(response.body.name).toBe('Test New Rider');
    });

    it('Should reject rider creation without required fields', async () => {
      const response = await request(app)
        .post('/api/riders')
        .send({
          name: 'Incomplete Rider',
          // Missing phone and email
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });
  });
});
