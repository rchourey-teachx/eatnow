import { EachMessagePayload } from 'kafkajs';
import { KAFKA_TOPICS, OrderStatus } from '../config';
import { redisClient } from '../database/redis';
import { orderService } from '../services/order.service';
import { matchingService } from '../services/matching.service';
import { riderService } from '../services/rider.service';
import {
  OrderCreatedEvent,
  OrderReadyEvent,
  OrderAssignedEvent,
  OrderDeliveredEvent,
  RiderOnlineEvent,
  RiderLocationEvent,
  RiderOfflineEvent,
} from '../types';

// Handler for order.created events
async function handleOrderCreated(payload: EachMessagePayload): Promise<void> {
  const message = payload.message.value?.toString();
  if (!message) return;

  const event: OrderCreatedEvent = JSON.parse(message);
  console.log('Processing order.created event:', event.orderId);

  // Set initial order status in Redis
  await redisClient.setOrderStatus(event.orderId, OrderStatus.CREATED);
}

// Handler for order.ready events
async function handleOrderReady(payload: EachMessagePayload): Promise<void> {
  const message = payload.message.value?.toString();
  if (!message) return;

  const event: OrderReadyEvent = JSON.parse(message);
  console.log('Processing order.ready event:', event.orderId);

  // Add to unassigned orders in Redis
  await redisClient.addUnassignedOrder(
    event.orderId,
    event.restaurantId,
    event.restaurantLocation
  );

  // Trigger matching service
  await matchingService.tryMatchOrder(event.orderId);
}

// Handler for order.assigned events
async function handleOrderAssigned(payload: EachMessagePayload): Promise<void> {
  const message = payload.message.value?.toString();
  if (!message) return;

  const event: OrderAssignedEvent = JSON.parse(message);
  console.log('Processing order.assigned event:', event.orderId, 'to rider:', event.riderId);

  // Update order status in Redis
  await redisClient.setOrderStatus(event.orderId, OrderStatus.ASSIGNED, {
    riderId: event.riderId,
    estimatedPickupTime: event.estimatedPickupTime,
  });

  // Update in Postgres
  await orderService.updateOrderStatus(event.orderId, OrderStatus.ASSIGNED, event.riderId);
}

// Handler for order.delivered events
async function handleOrderDelivered(payload: EachMessagePayload): Promise<void> {
  const message = payload.message.value?.toString();
  if (!message) return;

  const event: OrderDeliveredEvent = JSON.parse(message);
  console.log('Processing order.delivered event:', event.orderId);

  // Update order status in Redis
  await redisClient.setOrderStatus(event.orderId, OrderStatus.DELIVERED, {
    deliveredAt: event.deliveredAt,
  });

  // Clear rider's current order
  await redisClient.clearRiderCurrentOrder(event.riderId);

  // Update in Postgres
  await orderService.updateOrderStatus(event.orderId, OrderStatus.DELIVERED);

  // Try to assign a new order to this rider
  await matchingService.tryMatchRider(event.riderId);
}

// Handler for rider.online events
async function handleRiderOnline(payload: EachMessagePayload): Promise<void> {
  const message = payload.message.value?.toString();
  if (!message) return;

  const event: RiderOnlineEvent = JSON.parse(message);
  console.log('Processing rider.online event:', event.riderId);

  // Add rider to online riders in Redis
  await redisClient.addOnlineRider(event.riderId, event.location);

  // Update rider status in Postgres
  await riderService.updateRiderStatus(event.riderId, 'online');

  // Trigger matching service
  await matchingService.tryMatchRider(event.riderId);
}

// Handler for rider.location events
async function handleRiderLocation(payload: EachMessagePayload): Promise<void> {
  const message = payload.message.value?.toString();
  if (!message) return;

  const event: RiderLocationEvent = JSON.parse(message);
  console.log('Processing rider.location event:', event.riderId);

  // Update rider location in Redis
  await redisClient.setRiderLocation(event.riderId, event.location);

  // If rider has current order, update order status with location
  if (event.currentOrderId) {
    const currentStatus = await redisClient.getOrderStatus(event.currentOrderId);
    if (currentStatus) {
      await redisClient.setOrderStatus(event.currentOrderId, currentStatus.status as OrderStatus, {
        riderId: event.riderId,
        riderLocation: event.location,
      });
    }
  }

  // Save location to Postgres for history
  await riderService.saveLocationHistory(event.riderId, event.location);
}

// Handler for rider.offline events
async function handleRiderOffline(payload: EachMessagePayload): Promise<void> {
  const message = payload.message.value?.toString();
  if (!message) return;

  const event: RiderOfflineEvent = JSON.parse(message);
  console.log('Processing rider.offline event:', event.riderId);

  // Check if rider has an active order
  const currentOrderId = await redisClient.getRiderCurrentOrder(event.riderId);

  if (currentOrderId) {
    console.log(`Rider ${event.riderId} went offline with active order ${currentOrderId}`);
    // Trigger reassignment
    await matchingService.reassignOrder(currentOrderId, event.riderId);
  }

  // Remove rider from online riders in Redis
  await redisClient.removeOnlineRider(event.riderId);

  // Update rider status in Postgres
  await riderService.updateRiderStatus(event.riderId, 'offline');
}

// Create handlers map
export function createHandlersMap(): Map<string, (payload: EachMessagePayload) => Promise<void>> {
  const handlers = new Map<string, (payload: EachMessagePayload) => Promise<void>>();

  handlers.set(KAFKA_TOPICS.ORDER_CREATED, handleOrderCreated);
  handlers.set(KAFKA_TOPICS.ORDER_READY, handleOrderReady);
  handlers.set(KAFKA_TOPICS.ORDER_ASSIGNED, handleOrderAssigned);
  handlers.set(KAFKA_TOPICS.ORDER_DELIVERED, handleOrderDelivered);
  handlers.set(KAFKA_TOPICS.RIDER_ONLINE, handleRiderOnline);
  handlers.set(KAFKA_TOPICS.RIDER_LOCATION, handleRiderLocation);
  handlers.set(KAFKA_TOPICS.RIDER_OFFLINE, handleRiderOffline);

  return handlers;
}

export const eventHandlers = {
  handleOrderCreated,
  handleOrderReady,
  handleOrderAssigned,
  handleOrderDelivered,
  handleRiderOnline,
  handleRiderLocation,
  handleRiderOffline,
};
