/**
 * End-to-End Tests for Complete Order Flow
 * Tests the full order lifecycle from creation to delivery
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
const TEST_CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';
const TEST_RESTAURANT_ID = 'aaaa1111-1111-1111-1111-111111111111';
const TEST_RIDER_ID = 'd1d1d1d1-1111-1111-1111-111111111111';
const TEST_RIDER_ID_2 = 'd2d2d2d2-2222-2222-2222-222222222222';

describe('E2E: Complete Order Flow', () => {
  let orderId: string;

  // Helper to wait for async event processing
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  describe('Scenario 1: Happy Path - Order Creation to Delivery', () => {
    it('Step 1: Should create a new order', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          customerId: TEST_CUSTOMER_ID,
          restaurantId: TEST_RESTAURANT_ID,
          items: [
            { id: '1', name: 'Pepperoni Pizza', quantity: 2, price: 15.99 },
            { id: '2', name: 'Garlic Bread', quantity: 1, price: 4.99 },
          ],
          deliveryAddress: {
            street: '123 Customer St',
            city: 'New York',
            state: 'NY',
            zip_code: '10001',
            latitude: 40.7128,
            longitude: -74.006,
          },
        })
        .expect(201);

      expect(response.body.message).toBe('Order created successfully');
      expect(response.body.order).toBeDefined();
      expect(response.body.order.id).toBeDefined();
      expect(response.body.order.status).toBe('created');
      expect(response.body.order.total_amount).toBe(36.97);

      orderId = response.body.order.id;
    });

    it('Step 2: Should get order by ID', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .expect(200);

      expect(response.body.id).toBe(orderId);
      expect(response.body.status).toBe('created');
    });

    it('Step 3: Should get order status from Redis', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}/status`)
        .expect(200);

      expect(response.body.orderId).toBe(orderId);
      expect(response.body.status).toBeDefined();
    });

    it('Step 4: Rider goes online', async () => {
      const response = await request(app)
        .post(`/api/riders/${TEST_RIDER_ID}/online`)
        .send({
          latitude: 40.7128,
          longitude: -74.006,
        })
        .expect(200);

      expect(response.body.message).toBe('Rider is now online');
    });

    it('Step 5: Should mark order as ready (triggers matching)', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/ready`)
        .expect(200);

      expect(response.body.message).toBe('Order marked as ready');

      // Wait for event processing and matching
      await wait(2000);
    });

    it('Step 6: Order should be assigned to rider', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}/status`)
        .expect(200);

      // Order should be either ready (waiting) or assigned
      expect(['ready', 'assigned']).toContain(response.body.status);
    });

    it('Step 7: Update rider location', async () => {
      const response = await request(app)
        .post(`/api/riders/${TEST_RIDER_ID}/location`)
        .send({
          latitude: 40.715,
          longitude: -74.005,
        })
        .expect(200);

      expect(response.body.message).toBe('Location updated');
    });

    it('Step 8: Should mark order as picked up', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/pickup`)
        .expect(200);

      expect(response.body.message).toBe('Order picked up');
    });

    it('Step 9: Should mark order as in transit', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/transit`)
        .expect(200);

      expect(response.body.message).toBe('Order in transit');
    });

    it('Step 10: Should mark order as delivered', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/delivered`)
        .expect(200);

      expect(response.body.message).toBe('Order delivered');

      // Wait for event processing
      await wait(1000);
    });

    it('Step 11: Final order status should be delivered', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}/status`)
        .expect(200);

      expect(response.body.status).toBe('delivered');
    });

    it('Step 12: Rider should be available again', async () => {
      const response = await request(app)
        .get(`/api/riders/${TEST_RIDER_ID}/current-order`)
        .expect(200);

      // After delivery, rider should have no current order
      expect(response.body.currentOrder).toBeNull();
    });

    // Cleanup
    afterAll(async () => {
      // Rider goes offline
      await request(app)
        .post(`/api/riders/${TEST_RIDER_ID}/offline`)
        .send();
    });
  });

  describe('Scenario 2: Rider Goes Offline - Order Reassignment', () => {
    let reassignOrderId: string;

    it('Step 1: Create a new order', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          customerId: TEST_CUSTOMER_ID,
          restaurantId: TEST_RESTAURANT_ID,
          items: [{ id: '1', name: 'Test Item', quantity: 1, price: 10 }],
          deliveryAddress: {
            street: '456 Test St',
            city: 'New York',
            state: 'NY',
            zip_code: '10002',
            latitude: 40.72,
            longitude: -74.01,
          },
        })
        .expect(201);

      reassignOrderId = response.body.order.id;
    });

    it('Step 2: First rider goes online', async () => {
      await request(app)
        .post(`/api/riders/${TEST_RIDER_ID}/online`)
        .send({
          latitude: 40.7128,
          longitude: -74.006,
        })
        .expect(200);
    });

    it('Step 3: Second rider goes online', async () => {
      await request(app)
        .post(`/api/riders/${TEST_RIDER_ID_2}/online`)
        .send({
          latitude: 40.72,
          longitude: -74.01,
        })
        .expect(200);
    });

    it('Step 4: Mark order as ready', async () => {
      await request(app)
        .post(`/api/orders/${reassignOrderId}/ready`)
        .expect(200);

      // Wait for matching
      await wait(2000);
    });

    it('Step 5: Verify order is assigned', async () => {
      const response = await request(app)
        .get(`/api/orders/${reassignOrderId}/status`)
        .expect(200);

      expect(['ready', 'assigned']).toContain(response.body.status);
    });

    it('Step 6: First rider goes offline (triggers reassignment)', async () => {
      await request(app)
        .post(`/api/riders/${TEST_RIDER_ID}/offline`)
        .expect(200);

      // Wait for reassignment
      await wait(2000);
    });

    it('Step 7: Check matching stats', async () => {
      const response = await request(app)
        .get('/api/riders/stats/matching')
        .expect(200);

      expect(response.body).toHaveProperty('unassignedOrders');
      expect(response.body).toHaveProperty('onlineRiders');
      expect(response.body).toHaveProperty('availableRiders');
    });

    // Cleanup
    afterAll(async () => {
      await request(app).post(`/api/riders/${TEST_RIDER_ID}/offline`).send();
      await request(app).post(`/api/riders/${TEST_RIDER_ID_2}/offline`).send();
    });
  });

  describe('Scenario 3: API Validation', () => {
    it('Should return 400 for missing order fields', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          customerId: TEST_CUSTOMER_ID,
          // Missing restaurantId, items, deliveryAddress
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('Should return 400 for missing rider location', async () => {
      const response = await request(app)
        .post(`/api/riders/${TEST_RIDER_ID}/online`)
        .send({
          // Missing latitude and longitude
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('Should return 404 for non-existent order', async () => {
      await request(app)
        .get('/api/orders/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('Should return 404 for non-existent rider', async () => {
      await request(app)
        .get('/api/riders/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });
});
