import { Router } from 'express';
import { AnomaliesController } from '../controllers/anomaliesController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', AnomaliesController.getAnomalies);

export default router;
