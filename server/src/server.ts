import { createApp } from './app';
import { connectDB } from './config/db';
import { ENV } from './config/env';
import { Merchant } from './models';
import { seedDatabase } from './seed/seed';

const startServer = async () => {
  try {
    console.log('====================================================');
    console.log('       FinOps AI - Backend Engine Starting         ');
    console.log('====================================================');

    await connectDB();

    // Check if demo merchant exists; if not, auto-seed
    const merchantCount = await Merchant.countDocuments();
    if (merchantCount === 0) {
      console.log('[Server] Database is empty. Running initial demo seed...');
      await seedDatabase();
    } else {
      console.log(`[Server] Database has ${merchantCount} merchant record(s). Ready.`);
    }

    const app = createApp();
    const port = parseInt(ENV.PORT, 10) || 5000;

    app.listen(port, () => {
      console.log(`[Server] FinOps AI Server running on port ${port}`);
      console.log(`[Server] Healthcheck: http://localhost:${port}/api/health`);
      console.log(`[Server] Demo Merchant: merchant@novakart.demo / Demo@12345`);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
};

startServer();
