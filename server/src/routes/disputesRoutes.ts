import { Router } from 'express';
import { DisputesController } from '../controllers/disputesController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', DisputesController.getDisputes);

export default router;
