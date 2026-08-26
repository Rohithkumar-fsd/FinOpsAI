import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { seedDatabase } from '../seed/seed';

jest.setTimeout(180000);

let mongoServer: MongoMemoryServer;
let app: any;
let authToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await seedDatabase();
  app = createApp();

  // Perform login to acquire JWT token
  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'merchant@novakart.demo',
      password: 'Demo@12345',
    });

  authToken = res.body.token;
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('FinOps AI End-to-End API Tests', () => {
  test('POST /api/auth/login returns token and merchant info', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'merchant@novakart.demo',
        password: 'Demo@12345',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.merchant.name).toBe('NovaKart');
  });

  test('GET /api/dashboard/summary returns real metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.settlements.expectedAmount).toBe(2480000);
    expect(res.body.data.settlements.actualAmount).toBe(2160000);
    expect(res.body.data.settlements.difference).toBe(320000);
    expect(res.body.data.unreconciled.unreconciledCount).toBe(47);
  });

  test('GET /api/dashboard/health returns score ~72', async () => {
    const res = await request(app)
      .get('/api/dashboard/health')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.score).toBeGreaterThanOrEqual(68);
  });

  test('POST /api/agent/investigate runs full investigation workflow', async () => {
    const res = await request(app)
      .post('/api/agent/investigate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        question: 'Something is wrong with my finances. Investigate.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.investigationId).toBeDefined();
    expect(res.body.data.rootCauses.length).toBeGreaterThan(0);
    expect(res.body.data.requiresApproval).toBe(true);
    expect(res.body.data.toolActivity.length).toBeGreaterThan(0);
  });

  test('POST /api/resolutions/:id/approve executes resolution workflow', async () => {
    // Start investigation first
    const invRes = await request(app)
      .post('/api/agent/investigate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ question: 'Investigate discrepancy' });

    const investigationId = invRes.body.data.investigationId;

    // Approve resolution
    const approveRes = await request(app)
      .post(`/api/resolutions/${investigationId}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe('RESOLVED');
    expect(approveRes.body.data.reconciliationResult.matchedCount).toBe(31);
  });

  test('POST /api/payments/mock simulates a real demo payment', async () => {
    const res = await request(app)
      .post('/api/payments/mock')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 2500,
        currency: 'INR',
        paymentMethod: 'UPI',
        simulateStatus: 'SUCCESS',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment.paymentReference).toBeDefined();
  });
});
