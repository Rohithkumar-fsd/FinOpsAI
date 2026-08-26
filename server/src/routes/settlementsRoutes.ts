import { Router } from 'express';
import { SettlementsController } from '../controllers/settlementsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', SettlementsController.getSettlements);
router.get('/:id', SettlementsController.getSettlementById);

export default router;
