import { v4 as uuidv4 } from 'uuid';
import { postgresClient } from '../database/postgres';
import { redisClient } from '../database/redis';
import { eventProducer } from '../kafka/producer';
import { OrderStatus } from '../config';
import {
  Order,
  CreateOrderRequest,
  OrderStatusResponse,
  Location,
} from '../types';

class OrderService {
  // Create a new order
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const orderId = uuidv4();
    const totalAmount = request.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const query = `
      INSERT INTO orders (
        id, customer_id, restaurant_id, items, total_amount, status,
        delivery_street, delivery_city, delivery_state, delivery_zip_code,
        delivery_latitude, delivery_longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      orderId,
      request.customerId,
      request.restaurantId,
      JSON.stringify(request.items),
      totalAmount,
      OrderStatus.CREATED,
      request.deliveryAddress.street,
      request.deliveryAddress.city,
      request.deliveryAddress.state,
      request.deliveryAddress.zip_code,
      request.deliveryAddress.latitude,
      request.deliveryAddress.longitude,
    ];

    const result = await postgresClient.query<any>(query, values);
    const order = this.mapToOrder(result[0]);

    // Set initial order status in Redis
    await redisClient.setOrderStatus(orderId, OrderStatus.CREATED);

    // Emit order.created event
    await eventProducer.emitOrderCreated({
      orderId: order.id,
      customerId: order.customer_id,
      restaurantId: order.restaurant_id,
      items: order.items,
      totalAmount: order.total_amount,
      deliveryAddress: order.delivery_address,
      timestamp: new Date().toISOString(),
    });

    // Record status change
    await this.recordStatusChange(orderId, OrderStatus.CREATED);

    return order;
  }

  // Get order by ID
  async getOrderById(orderId: string): Promise<Order | null> {
    const query = 'SELECT * FROM orders WHERE id = $1';
    const result = await postgresClient.query<any>(query, [orderId]);

    if (result.length === 0) return null;
    return this.mapToOrder(result[0]);
  }

  // Get order status from Redis (for live status)
  async getOrderStatus(orderId: string): Promise<OrderStatusResponse | null> {
    // First try Redis for live status
    let status = await redisClient.getOrderStatus(orderId);

    if (!status) {
      // Fallback to Postgres if not in Redis
      const order = await this.getOrderById(orderId);
      if (!order) return null;

      status = {
        orderId: order.id,
        status: order.status,
        updatedAt: order.updated_at.toISOString(),
      };
    }

    // Enrich with rider location if assigned
    if (status.riderId) {
      const riderLocation = await redisClient.getRiderLocation(status.riderId);
      if (riderLocation) {
        status.riderLocation = riderLocation;
      }
    }

    return status;
  }

  // Mark order as ready (restaurant action)
  async markOrderReady(orderId: string): Promise<Order | null> {
    const order = await this.getOrderById(orderId);
    if (!order) return null;

    // Get restaurant location
    const restaurantQuery = 'SELECT latitude, longitude FROM restaurants WHERE id = $1';
    const restaurantResult = await postgresClient.query<any>(restaurantQuery, [order.restaurant_id]);

    if (restaurantResult.length === 0) {
      throw new Error('Restaurant not found');
    }

    const restaurantLocation: Location = {
      latitude: parseFloat(restaurantResult[0].latitude),
      longitude: parseFloat(restaurantResult[0].longitude),
      timestamp: new Date(),
    };

    // Update status in Postgres
    await this.updateOrderStatus(orderId, OrderStatus.READY);

    // Emit order.ready event
    await eventProducer.emitOrderReady({
      orderId,
      restaurantId: order.restaurant_id,
      restaurantLocation,
      timestamp: new Date().toISOString(),
    });

    return this.getOrderById(orderId);
  }

  // Update order status
  async updateOrderStatus(orderId: string, status: OrderStatus, riderId?: string): Promise<void> {
    let query = 'UPDATE orders SET status = $1';
    const values: any[] = [status];
    let paramCount = 1;

    if (riderId) {
      paramCount++;
      query += `, rider_id = $${paramCount}`;
      values.push(riderId);
    }

    if (status === OrderStatus.ASSIGNED) {
      paramCount++;
      query += `, assigned_at = $${paramCount}`;
      values.push(new Date());
    } else if (status === OrderStatus.PICKED_UP) {
      paramCount++;
      query += `, picked_up_at = $${paramCount}`;
      values.push(new Date());
    } else if (status === OrderStatus.DELIVERED) {
      paramCount++;
      query += `, delivered_at = $${paramCount}`;
      values.push(new Date());
    }

    paramCount++;
    query += ` WHERE id = $${paramCount}`;
    values.push(orderId);

    await postgresClient.query(query, values);
    await this.recordStatusChange(orderId, status);
  }

  // Record status change in history
  private async recordStatusChange(orderId: string, status: OrderStatus, metadata?: object): Promise<void> {
    const query = `
      INSERT INTO order_status_history (order_id, status, metadata)
      VALUES ($1, $2, $3)
    `;
    await postgresClient.query(query, [orderId, status, JSON.stringify(metadata || {})]);
  }

  // Get orders by customer
  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    const query = 'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC';
    const result = await postgresClient.query<any>(query, [customerId]);
    return result.map(this.mapToOrder);
  }

  // Get orders by status
  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    const query = 'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC';
    const result = await postgresClient.query<any>(query, [status]);
    return result.map(this.mapToOrder);
  }

  // Mark order as picked up
  async markOrderPickedUp(orderId: string): Promise<Order | null> {
    await this.updateOrderStatus(orderId, OrderStatus.PICKED_UP);
    await redisClient.setOrderStatus(orderId, OrderStatus.PICKED_UP);
    return this.getOrderById(orderId);
  }

  // Mark order as in transit
  async markOrderInTransit(orderId: string): Promise<Order | null> {
    await this.updateOrderStatus(orderId, OrderStatus.IN_TRANSIT);
    await redisClient.setOrderStatus(orderId, OrderStatus.IN_TRANSIT);
    return this.getOrderById(orderId);
  }

  // Mark order as delivered
  async markOrderDelivered(orderId: string): Promise<Order | null> {
    const riderId = await redisClient.getOrderRider(orderId);

    await this.updateOrderStatus(orderId, OrderStatus.DELIVERED);

    // Emit order.delivered event
    await eventProducer.emitOrderDelivered({
      orderId,
      riderId: riderId || 'unknown',
      deliveredAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });

    return this.getOrderById(orderId);
  }

  // Helper to map DB result to Order type
  private mapToOrder(row: any): Order {
    return {
      id: row.id,
      customer_id: row.customer_id,
      restaurant_id: row.restaurant_id,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      total_amount: parseFloat(row.total_amount),
      status: row.status as OrderStatus,
      delivery_address: {
        street: row.delivery_street,
        city: row.delivery_city,
        state: row.delivery_state,
        zip_code: row.delivery_zip_code,
        latitude: parseFloat(row.delivery_latitude),
        longitude: parseFloat(row.delivery_longitude),
      },
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

export const orderService = new OrderService();
