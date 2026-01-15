import { Router } from 'express';
import orderRoutes from './order.routes';
import riderRoutes from './rider.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/orders', orderRoutes);
router.use('/riders', riderRoutes);
router.use('/health', healthRoutes);

export default router;
