import { kafkaClient } from './client';
import { KAFKA_TOPICS } from '../config';
import {
  OrderCreatedEvent,
  OrderReadyEvent,
  OrderAssignedEvent,
  OrderDeliveredEvent,
  RiderOnlineEvent,
  RiderLocationEvent,
  RiderOfflineEvent,
} from '../types';

export const eventProducer = {
  // Order Events
  async emitOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await kafkaClient.produce(KAFKA_TOPICS.ORDER_CREATED, event, event.orderId);
  },

  async emitOrderReady(event: OrderReadyEvent): Promise<void> {
    await kafkaClient.produce(KAFKA_TOPICS.ORDER_READY, event, event.orderId);
  },

  async emitOrderAssigned(event: OrderAssignedEvent): Promise<void> {
    await kafkaClient.produce(KAFKA_TOPICS.ORDER_ASSIGNED, event, event.orderId);
  },

  async emitOrderDelivered(event: OrderDeliveredEvent): Promise<void> {
    await kafkaClient.produce(KAFKA_TOPICS.ORDER_DELIVERED, event, event.orderId);
  },

  // Rider Events
  async emitRiderOnline(event: RiderOnlineEvent): Promise<void> {
    await kafkaClient.produce(KAFKA_TOPICS.RIDER_ONLINE, event, event.riderId);
  },

  async emitRiderLocation(event: RiderLocationEvent): Promise<void> {
    await kafkaClient.produce(KAFKA_TOPICS.RIDER_LOCATION, event, event.riderId);
  },

  async emitRiderOffline(event: RiderOfflineEvent): Promise<void> {
    await kafkaClient.produce(KAFKA_TOPICS.RIDER_OFFLINE, event, event.riderId);
  },
};
