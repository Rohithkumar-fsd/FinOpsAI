import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/summary', DashboardController.getSummary);
router.get('/health', DashboardController.getHealth);
router.get('/charts', DashboardController.getCharts);
router.post('/stress-test', DashboardController.runStressTest);

export default router;
