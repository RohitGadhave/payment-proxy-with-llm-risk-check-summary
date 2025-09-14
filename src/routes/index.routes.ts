import { Router } from 'express';
import monitorRoutes from './monitor.routes';
import paymentRoutes from './payment-routes';
const router = Router();

router.use('/', paymentRoutes);
router.use('/monitor', monitorRoutes);

export default router;
export { router as apiRouter };
