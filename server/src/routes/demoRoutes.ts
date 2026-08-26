import { Router } from 'express';
import { DemoController } from '../controllers/demoController';

const router = Router();

router.post('/reset', DemoController.resetDemo);
router.post('/load', DemoController.loadScenario);

export default router;
