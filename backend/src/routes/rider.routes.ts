import { Router, Request, Response } from 'express';
import { riderService } from '../services/rider.service';
import { matchingService } from '../services/matching.service';

const router = Router();

// Create a new rider
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, vehicleType } = req.body;

    if (!name || !phone || !email) {
      return res.status(400).json({
        error: 'Missing required fields: name, phone, email',
      });
    }

    const rider = await riderService.createRider({
      name,
      phone,
      email,
      vehicleType: vehicleType || 'bicycle',
    });

    res.status(201).json({
      message: 'Rider created successfully',
      rider,
    });
  } catch (error: any) {
    console.error('Error creating rider:', error);
    res.status(500).json({ error: error.message || 'Failed to create rider' });
  }
});

// Get all riders
router.get('/', async (req: Request, res: Response) => {
  try {
    const riders = await riderService.getAllRiders();
    res.json(riders);
  } catch (error: any) {
    console.error('Error getting riders:', error);
    res.status(500).json({ error: error.message || 'Failed to get riders' });
  }
});

// Get online riders
router.get('/online', async (req: Request, res: Response) => {
  try {
    const riders = await riderService.getOnlineRiders();
    res.json(riders);
  } catch (error: any) {
    console.error('Error getting online riders:', error);
    res.status(500).json({ error: error.message || 'Failed to get online riders' });
  }
});

// Get rider by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rider = await riderService.getRiderById(id);

    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    res.json(rider);
  } catch (error: any) {
    console.error('Error getting rider:', error);
    res.status(500).json({ error: error.message || 'Failed to get rider' });
  }
});

// Rider goes online
router.post('/:id/online', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: latitude, longitude',
      });
    }

    const rider = await riderService.goOnline(id, {
      latitude,
      longitude,
      timestamp: new Date(),
    });

    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    res.json({
      message: 'Rider is now online',
      rider,
    });
  } catch (error: any) {
    console.error('Error going online:', error);
    res.status(500).json({ error: error.message || 'Failed to go online' });
  }
});

// Rider goes offline
router.post('/:id/offline', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rider = await riderService.goOffline(id);

    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    res.json({
      message: 'Rider is now offline',
      rider,
    });
  } catch (error: any) {
    console.error('Error going offline:', error);
    res.status(500).json({ error: error.message || 'Failed to go offline' });
  }
});

// Update rider location
router.post('/:id/location', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: latitude, longitude',
      });
    }

    await riderService.updateLocation(id, { latitude, longitude });

    res.json({
      message: 'Location updated',
    });
  } catch (error: any) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: error.message || 'Failed to update location' });
  }
});

// Get rider's current location
router.get('/:id/location', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const location = await riderService.getRiderLocation(id);

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error: any) {
    console.error('Error getting location:', error);
    res.status(500).json({ error: error.message || 'Failed to get location' });
  }
});

// Get rider's current order
router.get('/:id/current-order', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orderId = await riderService.getRiderCurrentOrder(id);

    if (!orderId) {
      return res.json({ currentOrder: null });
    }

    res.json({ currentOrder: orderId });
  } catch (error: any) {
    console.error('Error getting current order:', error);
    res.status(500).json({ error: error.message || 'Failed to get current order' });
  }
});

// Get rider location history
router.get('/:id/location-history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const history = await riderService.getLocationHistory(id, limit);
    res.json(history);
  } catch (error: any) {
    console.error('Error getting location history:', error);
    res.status(500).json({ error: error.message || 'Failed to get location history' });
  }
});

// Get matching stats
router.get('/stats/matching', async (req: Request, res: Response) => {
  try {
    const stats = await matchingService.getMatchingStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error getting matching stats:', error);
    res.status(500).json({ error: error.message || 'Failed to get matching stats' });
  }
});

export default router;
