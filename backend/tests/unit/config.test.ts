/**
 * Unit Tests for Configuration
 * Tests configuration values and constants
 */

import { OrderStatus, RiderStatus, KAFKA_TOPICS, REDIS_KEYS } from '../../src/config';

describe('Configuration', () => {
  describe('OrderStatus', () => {
    it('should have all expected statuses', () => {
      expect(OrderStatus.CREATED).toBe('created');
      expect(OrderStatus.CONFIRMED).toBe('confirmed');
      expect(OrderStatus.PREPARING).toBe('preparing');
      expect(OrderStatus.READY).toBe('ready');
      expect(OrderStatus.ASSIGNED).toBe('assigned');
      expect(OrderStatus.PICKED_UP).toBe('picked_up');
      expect(OrderStatus.IN_TRANSIT).toBe('in_transit');
      expect(OrderStatus.DELIVERED).toBe('delivered');
      expect(OrderStatus.CANCELLED).toBe('cancelled');
    });
  });

  describe('RiderStatus', () => {
    it('should have all expected statuses', () => {
      expect(RiderStatus.OFFLINE).toBe('offline');
      expect(RiderStatus.ONLINE).toBe('online');
      expect(RiderStatus.BUSY).toBe('busy');
    });
  });

  describe('KAFKA_TOPICS', () => {
    it('should have all expected topics', () => {
      expect(KAFKA_TOPICS.ORDER_CREATED).toBe('order.created');
      expect(KAFKA_TOPICS.ORDER_READY).toBe('order.ready');
      expect(KAFKA_TOPICS.ORDER_ASSIGNED).toBe('order.assigned');
      expect(KAFKA_TOPICS.ORDER_DELIVERED).toBe('order.delivered');
      expect(KAFKA_TOPICS.RIDER_ONLINE).toBe('rider.online');
      expect(KAFKA_TOPICS.RIDER_LOCATION).toBe('rider.location');
      expect(KAFKA_TOPICS.RIDER_OFFLINE).toBe('rider.offline');
    });
  });

  describe('REDIS_KEYS', () => {
    it('should generate correct order status key', () => {
      const key = REDIS_KEYS.ORDER_STATUS('test-order-123');
      expect(key).toBe('order:test-order-123:status');
    });

    it('should generate correct order rider key', () => {
      const key = REDIS_KEYS.ORDER_RIDER('test-order-456');
      expect(key).toBe('order:test-order-456:rider');
    });

    it('should generate correct rider location key', () => {
      const key = REDIS_KEYS.RIDER_LOCATION('test-rider-789');
      expect(key).toBe('rider:test-rider-789:location');
    });

    it('should generate correct rider current order key', () => {
      const key = REDIS_KEYS.RIDER_CURRENT_ORDER('test-rider-abc');
      expect(key).toBe('rider:test-rider-abc:current_order');
    });

    it('should have correct static keys', () => {
      expect(REDIS_KEYS.ORDERS_UNASSIGNED).toBe('orders:unassigned');
      expect(REDIS_KEYS.RIDERS_ONLINE).toBe('riders:online');
    });
  });
});
