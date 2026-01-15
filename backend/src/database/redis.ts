import Redis from 'ioredis';
import { config, REDIS_KEYS, OrderStatus } from '../config';
import { Location, OrderStatusResponse } from '../types';

class RedisClient {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  // ===== Order Operations =====

  async addUnassignedOrder(orderId: string, restaurantId: string, restaurantLocation: Location): Promise<void> {
    const orderData = JSON.stringify({
      orderId,
      restaurantId,
      restaurantLocation,
      addedAt: new Date().toISOString(),
    });
    await this.client.sadd(REDIS_KEYS.ORDERS_UNASSIGNED, orderData);
    await this.setOrderStatus(orderId, OrderStatus.READY);
  }

  async removeUnassignedOrder(orderId: string): Promise<void> {
    const members = await this.client.smembers(REDIS_KEYS.ORDERS_UNASSIGNED);
    for (const member of members) {
      const data = JSON.parse(member);
      if (data.orderId === orderId) {
        await this.client.srem(REDIS_KEYS.ORDERS_UNASSIGNED, member);
        break;
      }
    }
  }

  async getUnassignedOrders(): Promise<any[]> {
    const members = await this.client.smembers(REDIS_KEYS.ORDERS_UNASSIGNED);
    return members.map((m) => JSON.parse(m));
  }

  async setOrderStatus(orderId: string, status: OrderStatus, additionalData?: object): Promise<void> {
    const statusData = {
      orderId,
      status,
      updatedAt: new Date().toISOString(),
      ...additionalData,
    };
    await this.client.set(REDIS_KEYS.ORDER_STATUS(orderId), JSON.stringify(statusData));
    // Set TTL of 24 hours for order status
    await this.client.expire(REDIS_KEYS.ORDER_STATUS(orderId), 86400);
  }

  async getOrderStatus(orderId: string): Promise<OrderStatusResponse | null> {
    const data = await this.client.get(REDIS_KEYS.ORDER_STATUS(orderId));
    if (!data) return null;
    return JSON.parse(data);
  }

  async setOrderRider(orderId: string, riderId: string): Promise<void> {
    await this.client.set(REDIS_KEYS.ORDER_RIDER(orderId), riderId);
    await this.client.expire(REDIS_KEYS.ORDER_RIDER(orderId), 86400);
  }

  async getOrderRider(orderId: string): Promise<string | null> {
    return this.client.get(REDIS_KEYS.ORDER_RIDER(orderId));
  }

  // ===== Rider Operations =====

  async addOnlineRider(riderId: string, location: Location): Promise<void> {
    const riderData = JSON.stringify({
      riderId,
      location,
      onlineSince: new Date().toISOString(),
    });
    await this.client.sadd(REDIS_KEYS.RIDERS_ONLINE, riderData);
    await this.setRiderLocation(riderId, location);
  }

  async removeOnlineRider(riderId: string): Promise<void> {
    const members = await this.client.smembers(REDIS_KEYS.RIDERS_ONLINE);
    for (const member of members) {
      const data = JSON.parse(member);
      if (data.riderId === riderId) {
        await this.client.srem(REDIS_KEYS.RIDERS_ONLINE, member);
        break;
      }
    }
    await this.client.del(REDIS_KEYS.RIDER_LOCATION(riderId));
  }

  async getOnlineRiders(): Promise<any[]> {
    const members = await this.client.smembers(REDIS_KEYS.RIDERS_ONLINE);
    return members.map((m) => JSON.parse(m));
  }

  async isRiderOnline(riderId: string): Promise<boolean> {
    const riders = await this.getOnlineRiders();
    return riders.some((r) => r.riderId === riderId);
  }

  async setRiderLocation(riderId: string, location: Location): Promise<void> {
    const locationData = JSON.stringify({
      ...location,
      updatedAt: new Date().toISOString(),
    });
    await this.client.set(REDIS_KEYS.RIDER_LOCATION(riderId), locationData);
    // Set TTL of 1 hour for location data
    await this.client.expire(REDIS_KEYS.RIDER_LOCATION(riderId), 3600);
  }

  async getRiderLocation(riderId: string): Promise<Location | null> {
    const data = await this.client.get(REDIS_KEYS.RIDER_LOCATION(riderId));
    if (!data) return null;
    return JSON.parse(data);
  }

  async setRiderCurrentOrder(riderId: string, orderId: string): Promise<void> {
    await this.client.set(REDIS_KEYS.RIDER_CURRENT_ORDER(riderId), orderId);
  }

  async getRiderCurrentOrder(riderId: string): Promise<string | null> {
    return this.client.get(REDIS_KEYS.RIDER_CURRENT_ORDER(riderId));
  }

  async clearRiderCurrentOrder(riderId: string): Promise<void> {
    await this.client.del(REDIS_KEYS.RIDER_CURRENT_ORDER(riderId));
  }

  async isRiderAvailable(riderId: string): Promise<boolean> {
    const currentOrder = await this.getRiderCurrentOrder(riderId);
    return currentOrder === null;
  }

  // ===== Utility Operations =====

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }
}

export const redisClient = new RedisClient();
