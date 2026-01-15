import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'fooddelivery',
    password: process.env.POSTGRES_PASSWORD || 'fooddelivery123',
    database: process.env.POSTGRES_DB || 'fooddelivery',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'food-delivery-service',
    groupId: process.env.KAFKA_GROUP_ID || 'food-delivery-group',
  },
};

// Kafka Topics
export const KAFKA_TOPICS = {
  ORDER_CREATED: 'order.created',
  ORDER_READY: 'order.ready',
  ORDER_ASSIGNED: 'order.assigned',
  ORDER_DELIVERED: 'order.delivered',
  RIDER_ONLINE: 'rider.online',
  RIDER_LOCATION: 'rider.location',
  RIDER_OFFLINE: 'rider.offline',
} as const;

// Redis Keys
export const REDIS_KEYS = {
  ORDERS_UNASSIGNED: 'orders:unassigned',
  RIDERS_ONLINE: 'riders:online',
  ORDER_STATUS: (orderId: string) => `order:${orderId}:status`,
  ORDER_RIDER: (orderId: string) => `order:${orderId}:rider`,
  RIDER_LOCATION: (riderId: string) => `rider:${riderId}:location`,
  RIDER_CURRENT_ORDER: (riderId: string) => `rider:${riderId}:current_order`,
} as const;

// Order Statuses
export enum OrderStatus {
  CREATED = 'created',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// Rider Statuses
export enum RiderStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  BUSY = 'busy',
}
