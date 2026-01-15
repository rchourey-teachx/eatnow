import { redisClient } from '../database/redis';
import { postgresClient } from '../database/postgres';
import { eventProducer } from '../kafka/producer';
import { OrderStatus } from '../config';
import { Location } from '../types';

interface UnassignedOrder {
  orderId: string;
  restaurantId: string;
  restaurantLocation: Location;
  addedAt: string;
}

interface OnlineRider {
  riderId: string;
  location: Location;
  onlineSince: string;
}

class MatchingService {
  // Try to match a specific order with an available rider
  async tryMatchOrder(orderId: string): Promise<boolean> {
    console.log(`Attempting to match order ${orderId}`);

    // Get online riders
    const onlineRiders = await redisClient.getOnlineRiders();

    if (onlineRiders.length === 0) {
      console.log('No online riders available');
      return false;
    }

    // Find available rider (not currently delivering)
    for (const riderData of onlineRiders) {
      const rider: OnlineRider = riderData;
      const isAvailable = await redisClient.isRiderAvailable(rider.riderId);

      if (isAvailable) {
        // Found an available rider - assign the order
        await this.assignOrderToRider(orderId, rider.riderId);
        return true;
      }
    }

    console.log('No available riders found');
    return false;
  }

  // Try to match a specific rider with an unassigned order
  async tryMatchRider(riderId: string): Promise<boolean> {
    console.log(`Attempting to match rider ${riderId}`);

    // Check if rider is available
    const isAvailable = await redisClient.isRiderAvailable(riderId);
    if (!isAvailable) {
      console.log(`Rider ${riderId} is not available`);
      return false;
    }

    // Get unassigned orders
    const unassignedOrders = await redisClient.getUnassignedOrders();

    if (unassignedOrders.length === 0) {
      console.log('No unassigned orders');
      return false;
    }

    // Get rider location
    const riderLocation = await redisClient.getRiderLocation(riderId);
    if (!riderLocation) {
      console.log(`No location for rider ${riderId}`);
      return false;
    }

    // Find the closest order to the rider
    let closestOrder: UnassignedOrder | null = null;
    let minDistance = Infinity;

    for (const orderData of unassignedOrders) {
      const order: UnassignedOrder = orderData;
      const distance = this.calculateDistance(
        riderLocation.latitude,
        riderLocation.longitude,
        order.restaurantLocation.latitude,
        order.restaurantLocation.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestOrder = order;
      }
    }

    if (closestOrder) {
      await this.assignOrderToRider(closestOrder.orderId, riderId);
      return true;
    }

    return false;
  }

  // Assign an order to a rider
  private async assignOrderToRider(orderId: string, riderId: string): Promise<void> {
    console.log(`Assigning order ${orderId} to rider ${riderId}`);

    // Remove order from unassigned list
    await redisClient.removeUnassignedOrder(orderId);

    // Set order's rider in Redis
    await redisClient.setOrderRider(orderId, riderId);

    // Set rider's current order
    await redisClient.setRiderCurrentOrder(riderId, orderId);

    // Update order status
    await redisClient.setOrderStatus(orderId, OrderStatus.ASSIGNED, { riderId });

    // Get restaurant ID for the event
    const orderQuery = 'SELECT restaurant_id FROM orders WHERE id = $1';
    const orderResult = await postgresClient.query<any>(orderQuery, [orderId]);
    const restaurantId = orderResult.length > 0 ? orderResult[0].restaurant_id : 'unknown';

    // Calculate estimated pickup time (simplified - 15 minutes from now)
    const estimatedPickupTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Emit order.assigned event
    await eventProducer.emitOrderAssigned({
      orderId,
      riderId,
      restaurantId,
      estimatedPickupTime,
      timestamp: new Date().toISOString(),
    });

    console.log(`Order ${orderId} assigned to rider ${riderId}`);
  }

  // Reassign an order when a rider drops it (goes offline)
  async reassignOrder(orderId: string, previousRiderId: string): Promise<boolean> {
    console.log(`Reassigning order ${orderId} from rider ${previousRiderId}`);

    // Clear previous assignment
    await redisClient.clearRiderCurrentOrder(previousRiderId);

    // Get order details
    const orderQuery = 'SELECT restaurant_id FROM orders WHERE id = $1';
    const orderResult = await postgresClient.query<any>(orderQuery, [orderId]);

    if (orderResult.length === 0) {
      console.log(`Order ${orderId} not found`);
      return false;
    }

    // Get restaurant location
    const restaurantQuery = 'SELECT latitude, longitude FROM restaurants WHERE id = $1';
    const restaurantResult = await postgresClient.query<any>(restaurantQuery, [orderResult[0].restaurant_id]);

    if (restaurantResult.length === 0) {
      console.log('Restaurant not found');
      return false;
    }

    const restaurantLocation: Location = {
      latitude: parseFloat(restaurantResult[0].latitude),
      longitude: parseFloat(restaurantResult[0].longitude),
      timestamp: new Date(),
    };

    // Add order back to unassigned list
    await redisClient.addUnassignedOrder(orderId, orderResult[0].restaurant_id, restaurantLocation);

    // Update Redis status
    await redisClient.setOrderStatus(orderId, OrderStatus.READY, {
      reassigned: true,
      previousRiderId,
    });

    // Try to match with a new rider
    const matched = await this.tryMatchOrder(orderId);

    if (!matched) {
      console.log(`Order ${orderId} is waiting for a new rider`);
    }

    return matched;
  }

  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Get matching statistics
  async getMatchingStats(): Promise<{
    unassignedOrders: number;
    onlineRiders: number;
    availableRiders: number;
  }> {
    const unassignedOrders = await redisClient.getUnassignedOrders();
    const onlineRiders = await redisClient.getOnlineRiders();

    let availableRiders = 0;
    for (const rider of onlineRiders) {
      const isAvailable = await redisClient.isRiderAvailable(rider.riderId);
      if (isAvailable) availableRiders++;
    }

    return {
      unassignedOrders: unassignedOrders.length,
      onlineRiders: onlineRiders.length,
      availableRiders,
    };
  }
}

export const matchingService = new MatchingService();
