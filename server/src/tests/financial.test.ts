import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { seedDatabase } from '../seed/seed';
import { FinancialService } from '../services/financialService';
import { ReconciliationEngine } from '../services/reconciliationService';
import { FinancialAgentTools } from '../tools/financialTools';
import { Merchant } from '../models';

jest.setTimeout(180000);

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await seedDatabase();
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Financial Engine & Reconciliation Tests', () => {
  let merchantId: any;

  beforeAll(async () => {
    const merchant = await Merchant.findOne({ email: 'merchant@novakart.demo' });
    expect(merchant).toBeDefined();
    merchantId = merchant!._id;
  });

  test('Calculates settlement summary and discrepancy correctly', async () => {
    const settlement = await FinancialService.getSettlementSummary(merchantId);
    expect(settlement.expectedAmount).toBe(2480000);
    expect(settlement.actualAmount).toBe(2160000);
    expect(settlement.difference).toBe(320000);
  });

  test('Calculates unreconciled summary with 47 records', async () => {
    const unreconciled = await FinancialService.getUnreconciledSummary(merchantId);
    expect(unreconciled.unreconciledCount).toBe(47);
    expect(unreconciled.amountMismatchCount).toBe(7);
    expect(unreconciled.duplicateCount).toBe(9);
    expect(unreconciled.settlementIdMismatchCount).toBe(31);
    expect(unreconciled.unreconciledAmount).toBeGreaterThan(240000);
  });

  test('Calculates initial financial health score (~72-78)', async () => {
    const health = await FinancialService.calculateFinancialHealthScore(merchantId);
    expect(health.score).toBeGreaterThanOrEqual(68);
    expect(health.score).toBeLessThanOrEqual(82);
    expect(health.factors.length).toBeGreaterThan(0);
  });

  test('Generates reconciliation preview before approval', async () => {
    const preview = await ReconciliationEngine.preview(merchantId);
    expect(preview.totalRecordsToProcess).toBe(47);
    expect(preview.estimatedMatches).toBe(31);
    expect(preview.amountMismatches).toBe(7);
    expect(preview.duplicateMappings).toBe(9);
  });

  test('Executes real reconciliation engine and updates database state', async () => {
    const result = await ReconciliationEngine.runReconciliation(merchantId);
    expect(result.processedCount).toBe(47);
    expect(result.matchedCount).toBe(31);
    expect(result.manualReviewCount).toBe(7);
    expect(result.matchedAmount).toBeGreaterThanOrEqual(180000);
    expect(result.newHealthScore).toBeGreaterThan(result.previousHealthScore);
    expect(result.newHealthScore).toBeGreaterThanOrEqual(80);
  });

  test('AI agent tools execute and retrieve structured outputs', async () => {
    const tools = new FinancialAgentTools(merchantId);
    const impact = await tools.calculateFinancialImpact();
    expect(impact.totalFinancialImpact).toBeDefined();

    const plan = await tools.createResolutionPlan();
    expect(plan.action).toBe('EXECUTE_BATCH_RECONCILIATION');
    expect(plan.requiresMerchantApproval).toBe(true);
  });
});
