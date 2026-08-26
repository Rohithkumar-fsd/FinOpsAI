import { Router } from 'express';
import { RefundsController } from '../controllers/refundsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', RefundsController.getRefunds);

export default router;
