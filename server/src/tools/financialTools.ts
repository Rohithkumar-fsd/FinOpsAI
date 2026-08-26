import { Types } from 'mongoose';
import {
  Payment,
  Settlement,
  SettlementItem,
  Refund,
  Dispute,
  ReconciliationRecord,
  FinancialAnomaly,
  AgentAction,
  Order,
  WebhookLog,
} from '../models';
import { FinancialService } from '../services/financialService';
import { ReconciliationEngine } from '../services/reconciliationService';
import { WebhookService } from '../services/webhookService';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export class FinancialAgentTools {
  private merchantId: Types.ObjectId;
  private investigationId?: Types.ObjectId;

  constructor(merchantId: Types.ObjectId | string, investigationId?: Types.ObjectId | string) {
    this.merchantId = new Types.ObjectId(merchantId);
    if (investigationId) {
      this.investigationId = new Types.ObjectId(investigationId);
    }
  }

  public setInvestigationId(investigationId: Types.ObjectId | string) {
    this.investigationId = new Types.ObjectId(investigationId);
  }

  private async recordAction(toolName: string, actionType: string, input: any, output: any) {
    if (!this.investigationId) return;
    try {
      await AgentAction.create({
        investigationId: this.investigationId,
        merchantId: this.merchantId,
        toolName,
        actionType,
        input: input || {},
        output: output || {},
        status: 'SUCCESS',
      });
    } catch (err) {
      console.error(`[AgentAction] Error recording action for ${toolName}:`, err);
    }
  }

  // 1. getSettlementSummary
  async getSettlementSummary() {
    const summary = await FinancialService.getSettlementSummary(this.merchantId);
    await this.recordAction('getSettlementSummary', 'QUERY', {}, summary);
    return summary;
  }

  // 2. getPaymentSummary
  async getPaymentSummary() {
    const summary = await FinancialService.getPaymentSummary(this.merchantId);
    await this.recordAction('getPaymentSummary', 'QUERY', {}, summary);
    return summary;
  }

  // 3. getFailedPaymentSummary
  async getFailedPaymentSummary() {
    const payments = await FinancialService.getPaymentSummary(this.merchantId);
    const failedSamples = await Payment.find({
      merchantId: this.merchantId,
      status: 'FAILED',
    })
      .limit(5)
      .lean();

    const result = {
      failedCount: payments.failedCount,
      failedVolume: payments.failedVolume,
      failureRate: payments.totalTransactions > 0 
        ? Number(((payments.failedCount / payments.totalTransactions) * 100).toFixed(2)) 
        : 0,
      samples: failedSamples.map((p) => ({
        paymentId: p.paymentReference,
        amount: p.amount,
        method: p.paymentMethod,
        reason: p.failureReason,
        date: p.createdAt,
      })),
    };

    await this.recordAction('getFailedPaymentSummary', 'QUERY', {}, result);
    return result;
  }

  // 4. getRefundSummary
  async getRefundSummary() {
    const refunds = await FinancialService.getRefundSummary(this.merchantId);
    const pendingSamples = await Refund.find({
      merchantId: this.merchantId,
      status: 'PENDING',
    })
      .populate('paymentId')
      .limit(5)
      .lean();

    const result = {
      ...refunds,
      samples: pendingSamples.map((r: any) => ({
        refundId: r._id,
        paymentReference: r.paymentId?.paymentReference,
        amount: r.amount,
        reason: r.reason,
        requestedAt: r.requestedAt,
      })),
    };

    await this.recordAction('getRefundSummary', 'QUERY', {}, result);
    return result;
  }

  // 5. getUnreconciledTransactions
  async getUnreconciledTransactions(limit: number = 50) {
    const records = await ReconciliationRecord.find({
      merchantId: this.merchantId,
      status: { $in: ['UNMATCHED', 'REVIEW'] },
    })
      .populate('paymentId')
      .populate('orderId')
      .limit(limit)
      .lean();

    const totalUnreconciled = await ReconciliationRecord.countDocuments({
      merchantId: this.merchantId,
      status: { $in: ['UNMATCHED', 'REVIEW'] },
    });

    const totalAmount = records.reduce((sum, r) => sum + r.expectedAmount, 0);

    const result = {
      totalCount: totalUnreconciled,
      totalAmount: Math.round(totalAmount),
      records: records.map((r: any) => ({
        id: r._id,
        orderReference: r.orderId?.orderReference,
        paymentReference: r.paymentId?.paymentReference,
        status: r.status,
        mismatchType: r.mismatchType,
        expectedAmount: r.expectedAmount,
        actualAmount: r.actualAmount,
        difference: r.difference,
        evidence: r.evidence,
      })),
    };

    await this.recordAction('getUnreconciledTransactions', 'QUERY', { limit }, {
      totalCount: result.totalCount,
      totalAmount: result.totalAmount,
      sampleSize: result.records.length,
    });

    return result;
  }

  // 6. getAmountMismatches
  async getAmountMismatches() {
    const mismatches = await ReconciliationRecord.find({
      merchantId: this.merchantId,
      mismatchType: 'AMOUNT_MISMATCH',
      status: { $in: ['UNMATCHED', 'REVIEW'] },
    })
      .populate('paymentId')
      .populate('orderId')
      .lean();

    const totalAmount = mismatches.reduce((sum, r) => sum + r.expectedAmount, 0);
    const totalDifference = mismatches.reduce((sum, r) => sum + r.difference, 0);

    const result = {
      count: mismatches.length,
      totalAmount: Math.round(totalAmount),
      totalDifference: Math.round(totalDifference),
      mismatches: mismatches.map((m: any) => ({
        id: m._id,
        paymentReference: m.paymentId?.paymentReference,
        orderReference: m.orderId?.orderReference,
        expectedAmount: m.expectedAmount,
        actualAmount: m.actualAmount,
        difference: m.difference,
        reason: 'Settlement amount differs from authorized payment amount',
      })),
    };

    await this.recordAction('getAmountMismatches', 'QUERY', {}, {
      count: result.count,
      totalAmount: result.totalAmount,
      totalDifference: result.totalDifference,
    });

    return result;
  }

  // 7. getDuplicateTransactions
  async getDuplicateTransactions() {
    const duplicates = await ReconciliationRecord.find({
      merchantId: this.merchantId,
      mismatchType: 'DUPLICATE',
      status: { $in: ['UNMATCHED', 'REVIEW'] },
    })
      .populate('paymentId')
      .populate('orderId')
      .lean();

    const totalAmount = duplicates.reduce((sum, r) => sum + r.expectedAmount, 0);

    const result = {
      count: duplicates.length,
      totalAmount: Math.round(totalAmount),
      duplicates: duplicates.map((d: any) => ({
        id: d._id,
        paymentReference: d.paymentId?.paymentReference,
        orderReference: d.orderId?.orderReference,
        amount: d.expectedAmount,
        reason: 'Multiple payment attempts recorded against single order reference',
      })),
    };

    await this.recordAction('getDuplicateTransactions', 'QUERY', {}, {
      count: result.count,
      totalAmount: result.totalAmount,
    });

    return result;
  }

  // 8. getPaymentOrderMismatches
  async getPaymentOrderMismatches() {
    const records = await ReconciliationRecord.find({
      merchantId: this.merchantId,
      mismatchType: 'ORDER_PAYMENT_MISMATCH',
      status: { $in: ['UNMATCHED', 'REVIEW'] },
    })
      .populate('paymentId')
      .populate('orderId')
      .lean();

    const result = {
      count: records.length,
      records: records.map((r: any) => ({
        id: r._id,
        paymentReference: r.paymentId?.paymentReference,
        orderReference: r.orderId?.orderReference,
        amount: r.expectedAmount,
      })),
    };

    await this.recordAction('getPaymentOrderMismatches', 'QUERY', {}, result);
    return result;
  }

  // 9. getDelayedSettlements
  async getDelayedSettlements() {
    const delayed = await Settlement.find({
      merchantId: this.merchantId,
      status: 'DELAYED',
    }).lean();

    const totalDelayedAmount = delayed.reduce((sum, s) => sum + s.expectedAmount, 0);

    const result = {
      count: delayed.length,
      totalDelayedAmount: Math.round(totalDelayedAmount),
      settlements: delayed.map((s) => ({
        id: s._id,
        settlementReference: s.settlementReference,
        expectedAmount: s.expectedAmount,
        expectedDate: s.expectedDate,
        status: s.status,
      })),
    };

    await this.recordAction('getDelayedSettlements', 'QUERY', {}, result);
    return result;
  }

  // 10. getDisputeSummary
  async getDisputeSummary() {
    const disputeSummary = await FinancialService.getDisputeSummary(this.merchantId);
    await this.recordAction('getDisputeSummary', 'QUERY', {}, disputeSummary);
    return disputeSummary;
  }

  // 11. getFinancialAnomalies
  async getFinancialAnomalies() {
    const anomalies = await FinancialAnomaly.find({
      merchantId: this.merchantId,
      status: { $in: ['OPEN', 'INVESTIGATING'] },
    })
      .sort({ severity: 1, amount: -1 })
      .lean();

    const result = {
      count: anomalies.length,
      anomalies: anomalies.map((a) => ({
        id: a._id,
        type: a.type,
        severity: a.severity,
        amount: a.amount,
        description: a.description,
        evidence: a.evidence,
        detectedAt: a.detectedAt,
      })),
    };

    await this.recordAction('getFinancialAnomalies', 'QUERY', {}, { count: result.count });
    return result;
  }

  // 12. getTransactionDetails
  async getTransactionDetails(reference: string) {
    const payment = await Payment.findOne({
      merchantId: this.merchantId,
      paymentReference: reference,
    })
      .populate('orderId')
      .lean();

    if (!payment) {
      return { error: `Transaction ${reference} not found` };
    }

    const recon = await ReconciliationRecord.findOne({
      merchantId: this.merchantId,
      paymentId: payment._id,
    }).lean();

    const result = {
      payment,
      reconciliation: recon,
    };

    await this.recordAction('getTransactionDetails', 'QUERY', { reference }, result);
    return result;
  }

  // 13. getPaymentDetails
  async getPaymentDetails(paymentId: string) {
    const payment = await Payment.findOne({
      merchantId: this.merchantId,
      _id: paymentId,
    })
      .populate('orderId')
      .lean();

    await this.recordAction('getPaymentDetails', 'QUERY', { paymentId }, payment || {});
    return payment || { error: 'Payment not found' };
  }

  // 14. getSettlementDetails
  async getSettlementDetails(settlementId: string) {
    const settlement = await Settlement.findOne({
      merchantId: this.merchantId,
      _id: settlementId,
    }).lean();

    const items = settlement 
      ? await SettlementItem.find({ settlementId: settlement._id }).limit(20).lean() 
      : [];

    const result = { settlement, itemsCount: items.length, sampleItems: items };
    await this.recordAction('getSettlementDetails', 'QUERY', { settlementId }, result);
    return result;
  }

  // 15. calculateFinancialImpact
  async calculateFinancialImpact() {
    const settlement = await FinancialService.getSettlementSummary(this.merchantId);
    const unreconciled = await FinancialService.getUnreconciledSummary(this.merchantId);
    const payments = await FinancialService.getPaymentSummary(this.merchantId);
    const refunds = await FinancialService.getRefundSummary(this.merchantId);

    const totalImpact = settlement.difference;

    const result = {
      totalFinancialImpact: totalImpact,
      settlementDiscrepancy: settlement.difference,
      unreconciledAmount: unreconciled.unreconciledAmount,
      failedPaymentVolume: payments.failedVolume,
      pendingRefundVolume: refunds.pendingRefundAmount,
      primaryDriver: 'Settlement batch mapping lag and gateway reference mismatches',
    };

    await this.recordAction('calculateFinancialImpact', 'CALCULATION', {}, result);
    return result;
  }

  // 16. createResolutionPlan
  async createResolutionPlan() {
    const preview = await ReconciliationEngine.preview(this.merchantId);

    const plan = {
      action: 'EXECUTE_BATCH_RECONCILIATION',
      targetRecords: preview.totalRecordsToProcess,
      projectedMatches: preview.estimatedMatches,
      projectedRecoveredAmount: preview.estimatedMatchedAmount,
      manualReviewRequired: preview.requiresReviewCount,
      unresolvedRecords: preview.unresolvedCount,
      requiresMerchantApproval: true,
      approvalEndpoint: '/api/resolutions/reconciliation/approve',
    };

    await this.recordAction('createResolutionPlan', 'PLANNING', {}, plan);
    return plan;
  }

  // 17. runReconciliation
  async runReconciliation() {
    const result = await ReconciliationEngine.runReconciliation(this.merchantId);
    await this.recordAction('runReconciliation', 'EXECUTION', {}, result);
    return result;
  }

  // 18. getFinancialHealth
  async getFinancialHealth() {
    const health = await FinancialService.calculateFinancialHealthScore(this.merchantId);
    await this.recordAction('getFinancialHealth', 'CALCULATION', {}, health);
    return health;
  }

  // 19. getWebhookSummary
  async getWebhookSummary() {
    const summary = await WebhookService.getWebhookSummary(this.merchantId);
    await this.recordAction('getWebhookSummary', 'DATABASE_QUERY', {}, summary);
    return summary;
  }

  // 20. getFailedWebhooks
  async getFailedWebhooks(limit: number = 20) {
    const failed = await WebhookLog.find({
      merchantId: this.merchantId,
      status: 'FAILED',
    })
      .sort({ receivedAt: -1 })
      .limit(limit)
      .lean();

    const result = {
      count: failed.length,
      webhooks: failed,
    };
    await this.recordAction('getFailedWebhooks', 'DATABASE_QUERY', { limit }, result);
    return result;
  }

  // 21. getDuplicateWebhooks
  async getDuplicateWebhooks(limit: number = 20) {
    const duplicates = await WebhookLog.find({
      merchantId: this.merchantId,
      status: 'DUPLICATE',
    })
      .sort({ receivedAt: -1 })
      .limit(limit)
      .lean();

    const totalDuplicateVolume = duplicates.reduce((sum, d) => sum + (d.amount || 0), 0);

    const result = {
      count: duplicates.length,
      totalDuplicateVolume,
      webhooks: duplicates,
    };
    await this.recordAction('getDuplicateWebhooks', 'DATABASE_QUERY', { limit }, result);
    return result;
  }

  // 22. getInvalidSignatureWebhooks
  async getInvalidSignatureWebhooks(limit: number = 20) {
    const invalidSig = await WebhookLog.find({
      merchantId: this.merchantId,
      status: 'INVALID_SIGNATURE',
    })
      .sort({ receivedAt: -1 })
      .limit(limit)
      .lean();

    const result = {
      count: invalidSig.length,
      webhooks: invalidSig,
    };
    await this.recordAction('getInvalidSignatureWebhooks', 'DATABASE_QUERY', { limit }, result);
    return result;
  }

  // 23. getOutOfOrderWebhooks
  async getOutOfOrderWebhooks(limit: number = 20) {
    const outOfOrder = await WebhookLog.find({
      merchantId: this.merchantId,
      status: 'OUT_OF_ORDER',
    })
      .sort({ receivedAt: -1 })
      .limit(limit)
      .lean();

    const result = {
      count: outOfOrder.length,
      webhooks: outOfOrder,
    };
    await this.recordAction('getOutOfOrderWebhooks', 'DATABASE_QUERY', { limit }, result);
    return result;
  }

  // 24. getWebhookDetails
  async getWebhookDetails(webhookId: string) {
    const webhook = await WebhookLog.findOne({
      _id: webhookId,
      merchantId: this.merchantId,
    }).lean();

    await this.recordAction('getWebhookDetails', 'DATABASE_QUERY', { webhookId }, webhook);
    return webhook;
  }

  /**
   * Execute tool dynamically by name
   */
  async executeTool(toolName: string, args: Record<string, any> = {}): Promise<any> {
    switch (toolName) {
      case 'getSettlementSummary':
        return this.getSettlementSummary();
      case 'getPaymentSummary':
        return this.getPaymentSummary();
      case 'getFailedPaymentSummary':
        return this.getFailedPaymentSummary();
      case 'getRefundSummary':
        return this.getRefundSummary();
      case 'getUnreconciledTransactions':
        return this.getUnreconciledTransactions(args.limit);
      case 'getAmountMismatches':
        return this.getAmountMismatches();
      case 'getDuplicateTransactions':
        return this.getDuplicateTransactions();
      case 'getPaymentOrderMismatches':
        return this.getPaymentOrderMismatches();
      case 'getDelayedSettlements':
        return this.getDelayedSettlements();
      case 'getDisputeSummary':
        return this.getDisputeSummary();
      case 'getFinancialAnomalies':
        return this.getFinancialAnomalies();
      case 'getTransactionDetails':
        return this.getTransactionDetails(args.reference);
      case 'getPaymentDetails':
        return this.getPaymentDetails(args.paymentId);
      case 'getSettlementDetails':
        return this.getSettlementDetails(args.settlementId);
      case 'calculateFinancialImpact':
        return this.calculateFinancialImpact();
      case 'createResolutionPlan':
        return this.createResolutionPlan();
      case 'runReconciliation':
        return this.runReconciliation();
      case 'getFinancialHealth':
        return this.getFinancialHealth();
      case 'getWebhookSummary':
        return this.getWebhookSummary();
      case 'getFailedWebhooks':
        return this.getFailedWebhooks(args.limit);
      case 'getDuplicateWebhooks':
        return this.getDuplicateWebhooks(args.limit);
      case 'getInvalidSignatureWebhooks':
        return this.getInvalidSignatureWebhooks(args.limit);
      case 'getOutOfOrderWebhooks':
        return this.getOutOfOrderWebhooks(args.limit);
      case 'getWebhookDetails':
        return this.getWebhookDetails(args.webhookId);
      default:
        throw new Error(`Tool ${toolName} not found`);
    }
  }

  /**
   * Tool definitions specifications for LLM function calling
   */
  static getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'getSettlementSummary',
        description: 'Get total expected settlement, actual settled amount, settlement difference, and settlement batch status.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getPaymentSummary',
        description: 'Get total payment volume, transaction counts, success rate, and payment status breakdown.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getFailedPaymentSummary',
        description: 'Get count and volume of failed payments, failure reasons, and recent samples.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getRefundSummary',
        description: 'Get pending vs processed refund amounts, counts, and reason details.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getUnreconciledTransactions',
        description: 'Get list of unreconciled transactions with mismatch types, amounts, and evidence.',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max number of records to return' },
          },
        },
      },
      {
        name: 'getAmountMismatches',
        description: 'Get transactions where settled amount does not equal authorized payment amount.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getDuplicateTransactions',
        description: 'Get duplicate transactions or multiple payments linked to the same order.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getPaymentOrderMismatches',
        description: 'Get payment records that do not match existing customer orders.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getDelayedSettlements',
        description: 'Get settlements that are delayed beyond the expected settlement date.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getDisputeSummary',
        description: 'Get open chargebacks, disputes, amounts, and review statuses.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getFinancialAnomalies',
        description: 'Get detected financial anomalies with severity ratings and amounts.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'calculateFinancialImpact',
        description: 'Calculate aggregated financial impact of discrepancies, lost revenues, and pending funds.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'createResolutionPlan',
        description: 'Generate an actionable resolution plan preview for merchant approval before modifying records.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getFinancialHealth',
        description: 'Get the deterministic financial health score (0-100) and weighted risk factor breakdown.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getWebhookSummary',
        description: 'Get webhook delivery summary, total counts, success rate, duplicate counts, invalid signatures, and out-of-order logs.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'getFailedWebhooks',
        description: 'Get recent webhooks that failed delivery or database write locks.',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max records to return' },
          },
        },
      },
      {
        name: 'getDuplicateWebhooks',
        description: 'Get duplicate webhook events and idempotency replay occurrences.',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max records to return' },
          },
        },
      },
      {
        name: 'getInvalidSignatureWebhooks',
        description: 'Get webhook events that failed cryptographic HMAC SHA-256 signature verification.',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max records to return' },
          },
        },
      },
      {
        name: 'getOutOfOrderWebhooks',
        description: 'Get webhooks that arrived with out-of-order state sequences (e.g. refund before capture).',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max records to return' },
          },
        },
      },
      {
        name: 'getWebhookDetails',
        description: 'Get detailed payload, headers, signature, and processing errors for a specific webhook log ID.',
        parameters: {
          type: 'object',
          properties: {
            webhookId: { type: 'string', description: 'The MongoDB ObjectId of the webhook log' },
          },
          required: ['webhookId'],
        },
      },
    ];
  }
}
