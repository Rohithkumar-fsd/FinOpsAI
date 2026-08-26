import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { seedDatabase } from '../seed/seed';
import { WebhookService } from '../services/webhookService';
import { FinancialAgentTools } from '../tools/financialTools';
import { Merchant, WebhookLog, FinancialAnomaly } from '../models';

jest.setTimeout(180000);

let mongoServer: MongoMemoryServer;
let app: any;
let authToken: string;
let merchantId: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await seedDatabase();
  app = createApp();

  const merchant = await Merchant.findOne({ email: 'merchant@novakart.demo' });
  merchantId = merchant!._id;

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

describe('Automated Webhook Ingestion & Audit Explorer Tests', () => {
  test('1. Ingests valid webhook with cryptographic signature verification (SUCCESS)', async () => {
    const eventId = `evt_test_valid_${Date.now()}`;
    const payload = {
      eventId,
      eventType: 'payment.captured',
      entity: { id: `pay_test_${Date.now()}`, amount: 4500, status: 'captured' },
      amount: 4500,
    };
    const signature = WebhookService.computeSignature(payload);

    const res = await request(app)
      .post('/api/webhooks/ingest')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        eventId,
        eventType: 'payment.captured',
        payload,
        signature,
        idempotencyKey: `idem_${eventId}`,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SUCCESS');
    expect(res.body.data.webhookLog.signatureValid).toBe(true);

    const dbLog = await WebhookLog.findOne({ eventId });
    expect(dbLog).toBeDefined();
    expect(dbLog!.status).toBe('SUCCESS');
  });

  test('2. Detects and blocks invalid cryptographic HMAC signatures (INVALID_SIGNATURE)', async () => {
    const eventId = `evt_test_bad_sig_${Date.now()}`;
    const payload = {
      eventId,
      eventType: 'payment.authorized',
      amount: 8900,
    };

    const res = await request(app)
      .post('/api/webhooks/ingest')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        eventId,
        eventType: 'payment.authorized',
        payload,
        signature: 'invalid_forged_hash_key_123',
        idempotencyKey: `idem_${eventId}`,
      });

    expect(res.status).toBe(401);
    expect(res.body.data.status).toBe('INVALID_SIGNATURE');

    // Check anomaly logged in MongoDB
    const anomaly = await FinancialAnomaly.findOne({
      merchantId,
      type: 'SIGNATURE_MISMATCH',
      'evidence.eventId': eventId,
    });
    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe('CRITICAL');
  });

  test('3. Detects duplicate webhook events and prevents balance inflation (DUPLICATE)', async () => {
    const eventId = `evt_test_duplicate_${Date.now()}`;
    const payload = {
      eventId,
      eventType: 'payment.captured',
      amount: 3200,
    };
    const signature = WebhookService.computeSignature(payload);

    // Initial ingestion
    await request(app)
      .post('/api/webhooks/ingest')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        eventId,
        eventType: 'payment.captured',
        payload,
        signature,
        idempotencyKey: `idem_dup_test_${eventId}`,
      });

    // Replay duplicate event
    const dupRes = await request(app)
      .post('/api/webhooks/ingest')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        eventId,
        eventType: 'payment.captured',
        payload,
        signature,
        idempotencyKey: `idem_dup_test_${eventId}`,
      });

    expect(dupRes.status).toBe(202);
    expect(dupRes.body.data.status).toBe('DUPLICATE');

    const duplicateAnomaly = await FinancialAnomaly.findOne({
      merchantId,
      type: 'DUPLICATE_PAYMENT_WEBHOOK',
      'evidence.originalEventId': eventId,
    });
    expect(duplicateAnomaly).toBeDefined();
  });

  test('4. Detects out-of-order sequence events (OUT_OF_ORDER)', async () => {
    const eventId = `evt_test_ooo_${Date.now()}`;
    const ghostPaymentId = `pay_ghost_${Date.now()}`;
    const payload = {
      eventId,
      eventType: 'payment.refunded',
      paymentId: ghostPaymentId,
      amount: 2500,
      simulateOutOfOrder: true,
    };
    const signature = WebhookService.computeSignature(payload);

    const res = await request(app)
      .post('/api/webhooks/ingest')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        eventId,
        eventType: 'payment.refunded',
        payload,
        signature,
        idempotencyKey: `idem_${eventId}`,
      });

    expect(res.status).toBe(202);
    expect(res.body.data.status).toBe('OUT_OF_ORDER');

    const oooAnomaly = await FinancialAnomaly.findOne({
      merchantId,
      type: 'OUT_OF_ORDER_WEBHOOK',
      'evidence.eventId': eventId,
    });
    expect(oooAnomaly).toBeDefined();
  });

  test('5. Retries a failed or out-of-order webhook event (RETRIED)', async () => {
    const failedLog = await WebhookLog.findOne({ merchantId, status: 'FAILED' });
    expect(failedLog).toBeDefined();

    const res = await request(app)
      .post(`/api/webhooks/logs/${failedLog!._id}/retry`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.webhookLog.status).toBe('RETRIED');
    expect(res.body.data.webhookLog.retryCount).toBeGreaterThanOrEqual(1);
  });

  test('6. Executes simulator demo endpoints for all 5 scenarios', async () => {
    const scenarios = ['SUCCESS', 'DUPLICATE', 'INVALID_SIGNATURE', 'OUT_OF_ORDER', 'FAILED'] as const;

    for (const scenario of scenarios) {
      const res = await request(app)
        .post('/api/webhooks/simulate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scenario });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scenario).toBe(scenario);
      expect(res.body.data.summary).toBeDefined();
    }
  });

  test('7. AI investigator tools retrieve grounded webhook metrics and anomaly evidence', async () => {
    const tools = new FinancialAgentTools(merchantId);

    const summary = await tools.getWebhookSummary();
    expect(summary.totalIngested).toBeGreaterThan(0);
    expect(summary.successRate).toBeDefined();

    const duplicates = await tools.getDuplicateWebhooks(5);
    expect(duplicates.count).toBeGreaterThanOrEqual(1);

    const invalidSigs = await tools.getInvalidSignatureWebhooks(5);
    expect(invalidSigs.count).toBeGreaterThanOrEqual(1);

    const outOfOrder = await tools.getOutOfOrderWebhooks(5);
    expect(outOfOrder.count).toBeGreaterThanOrEqual(1);
  });
});
