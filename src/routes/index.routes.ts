import { Router } from 'express';
import monitorRoutes from './monitor.routes';
import paymentRoutes from './payment-routes';
const router = Router();

router.use('/monitor', monitorRoutes);
router.use('/payment', paymentRoutes);

export default router;
export { router as apiRouter };