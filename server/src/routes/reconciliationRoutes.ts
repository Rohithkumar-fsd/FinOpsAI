import { Router } from 'express';
import { ReconciliationController } from '../controllers/reconciliationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/summary', ReconciliationController.getSummary);
router.get('/records', ReconciliationController.getRecords);
router.get('/', ReconciliationController.getRecords);
router.get('/preview', ReconciliationController.getPreview);
router.post('/run', ReconciliationController.runReconciliation);

export default router;
