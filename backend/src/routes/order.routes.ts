import { Router, Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { CreateOrderRequest } from '../types';

const router = Router();

// Create a new order
router.post('/', async (req: Request, res: Response) => {
  try {
    const orderData: CreateOrderRequest = req.body;

    // Validate required fields
    if (!orderData.customerId || !orderData.restaurantId || !orderData.items || !orderData.deliveryAddress) {
      return res.status(400).json({
        error: 'Missing required fields: customerId, restaurantId, items, deliveryAddress',
      });
    }

    const order = await orderService.createOrder(orderData);
    res.status(201).json({
      message: 'Order created successfully',
      order,
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// Get order by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    console.error('Error getting order:', error);
    res.status(500).json({ error: error.message || 'Failed to get order' });
  }
});

// Get order status (from Redis for live status)
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = await orderService.getOrderStatus(id);

    if (!status) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(status);
  } catch (error: any) {
    console.error('Error getting order status:', error);
    res.status(500).json({ error: error.message || 'Failed to get order status' });
  }
});

// Mark order as ready (restaurant action)
router.post('/:id/ready', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await orderService.markOrderReady(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order marked as ready',
      order,
    });
  } catch (error: any) {
    console.error('Error marking order ready:', error);
    res.status(500).json({ error: error.message || 'Failed to mark order ready' });
  }
});

// Mark order as picked up (rider action)
router.post('/:id/pickup', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await orderService.markOrderPickedUp(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order picked up',
      order,
    });
  } catch (error: any) {
    console.error('Error picking up order:', error);
    res.status(500).json({ error: error.message || 'Failed to pick up order' });
  }
});

// Mark order as in transit (rider action)
router.post('/:id/transit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await orderService.markOrderInTransit(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order in transit',
      order,
    });
  } catch (error: any) {
    console.error('Error marking order in transit:', error);
    res.status(500).json({ error: error.message || 'Failed to mark order in transit' });
  }
});

// Mark order as delivered (rider action)
router.post('/:id/delivered', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await orderService.markOrderDelivered(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order delivered',
      order,
    });
  } catch (error: any) {
    console.error('Error marking order delivered:', error);
    res.status(500).json({ error: error.message || 'Failed to mark order delivered' });
  }
});

// Get orders by customer
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const orders = await orderService.getOrdersByCustomer(customerId);
    res.json(orders);
  } catch (error: any) {
    console.error('Error getting customer orders:', error);
    res.status(500).json({ error: error.message || 'Failed to get customer orders' });
  }
});

export default router;
