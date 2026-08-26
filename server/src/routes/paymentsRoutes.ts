import { Router } from 'express';
import { PaymentsController } from '../controllers/paymentsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', PaymentsController.getPayments);
router.get('/:id', PaymentsController.getPaymentById);
router.post('/mock', PaymentsController.createMockPayment);

export default router;
