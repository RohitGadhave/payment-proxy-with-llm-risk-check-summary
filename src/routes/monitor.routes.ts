// Health check
import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { MonitorController } from '../controllers/monitor.controller';

const monitorController = new MonitorController();
const router = Router();
router.get('/health', asyncHandler(monitorController.healthCheck));
router.get('/ping', asyncHandler(monitorController.ping));


export default router;
