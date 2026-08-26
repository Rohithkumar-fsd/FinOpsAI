import mongoose, { Types } from 'mongoose';
import {
  Payment,
  Settlement,
  Refund,
  Dispute,
  ReconciliationRecord,
  FinancialAnomaly,
  Order,
  Customer,
} from '../models';

export interface ISettlementSummary {
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  totalSettlements: number;
  delayedCount: number;
  settledCount: number;
}

export interface IPaymentSummary {
  totalVolume: number;
  totalTransactions: number;
  successfulVolume: number;
  successfulCount: number;
  failedVolume: number;
  failedCount: number;
  pendingVolume: number;
  pendingCount: number;
  refundedVolume: number;
  refundedCount: number;
  successRate: number;
}

export interface IRefundSummary {
  totalRefundAmount: number;
  totalRefundCount: number;
  pendingRefundAmount: number;
  pendingRefundCount: number;
  processedRefundAmount: number;
  processedRefundCount: number;
}

export interface IUnreconciledSummary {
  unreconciledCount: number;
  unreconciledAmount: number;
  amountMismatchCount: number;
  amountMismatchAmount: number;
  settlementIdMismatchCount: number;
  settlementIdMismatchAmount: number;
  duplicateCount: number;
  duplicateAmount: number;
  orderPaymentMismatchCount: number;
  orderPaymentMismatchAmount: number;
  missingSettlementCount: number;
  missingSettlementAmount: number;
}

export interface IDisputeSummary {
  totalDisputeAmount: number;
  totalDisputeCount: number;
  openDisputeAmount: number;
  openDisputeCount: number;
  underReviewCount: number;
}

export interface IFinancialHealthScore {
  score: number;
  previousScore?: number;
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  factors: {
    name: string;
    impact: number;
    score: number;
    description: string;
  }[];
}

export class FinancialService {
  /**
   * Get payment summary including volume, success, failure, refund counts
   */
  static async getPaymentSummary(merchantId: Types.ObjectId | string): Promise<IPaymentSummary> {
    const mId = new Types.ObjectId(merchantId);

    const stats = await Payment.aggregate([
      { $match: { merchantId: mId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    let totalVolume = 0;
    let totalTransactions = 0;
    let successfulVolume = 0;
    let successfulCount = 0;
    let failedVolume = 0;
    let failedCount = 0;
    let pendingVolume = 0;
    let pendingCount = 0;
    let refundedVolume = 0;
    let refundedCount = 0;

    stats.forEach((item) => {
      totalVolume += item.totalAmount;
      totalTransactions += item.count;
      if (item._id === 'SUCCESS') {
        successfulVolume = item.totalAmount;
        successfulCount = item.count;
      } else if (item._id === 'FAILED') {
        failedVolume = item.totalAmount;
        failedCount = item.count;
      } else if (item._id === 'PENDING') {
        pendingVolume = item.totalAmount;
        pendingCount = item.count;
      } else if (item._id === 'REFUNDED') {
        refundedVolume = item.totalAmount;
        refundedCount = item.count;
      }
    });

    const successRate = totalTransactions > 0 
      ? Number(((successfulCount / totalTransactions) * 100).toFixed(2)) 
      : 0;

    return {
      totalVolume,
      totalTransactions,
      successfulVolume,
      successfulCount,
      failedVolume,
      failedCount,
      pendingVolume,
      pendingCount,
      refundedVolume,
      refundedCount,
      successRate,
    };
  }

  /**
   * Get Settlement Summary: Expected vs Actual and difference
   */
  static async getSettlementSummary(merchantId: Types.ObjectId | string): Promise<ISettlementSummary> {
    const mId = new Types.ObjectId(merchantId);

    const result = await Settlement.aggregate([
      { $match: { merchantId: mId } },
      {
        $group: {
          _id: null,
          expectedAmount: { $sum: '$expectedAmount' },
          actualAmount: { $sum: '$actualAmount' },
          totalSettlements: { $sum: 1 },
          delayedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'DELAYED'] }, 1, 0] },
          },
          settledCount: {
            $sum: { $cond: [{ $eq: ['$status', 'SETTLED'] }, 1, 0] },
          },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return {
        expectedAmount: 0,
        actualAmount: 0,
        difference: 0,
        totalSettlements: 0,
        delayedCount: 0,
        settledCount: 0,
      };
    }

    const row = result[0];
    const difference = Math.max(0, row.expectedAmount - row.actualAmount);

    return {
      expectedAmount: Math.round(row.expectedAmount),
      actualAmount: Math.round(row.actualAmount),
      difference: Math.round(difference),
      totalSettlements: row.totalSettlements,
      delayedCount: row.delayedCount,
      settledCount: row.settledCount,
    };
  }

  /**
   * Get Refund summary: pending vs processed
   */
  static async getRefundSummary(merchantId: Types.ObjectId | string): Promise<IRefundSummary> {
    const mId = new Types.ObjectId(merchantId);

    const stats = await Refund.aggregate([
      { $match: { merchantId: mId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]);

    let totalRefundAmount = 0;
    let totalRefundCount = 0;
    let pendingRefundAmount = 0;
    let pendingRefundCount = 0;
    let processedRefundAmount = 0;
    let processedRefundCount = 0;

    stats.forEach((item) => {
      totalRefundAmount += item.amount;
      totalRefundCount += item.count;
      if (item._id === 'PENDING') {
        pendingRefundAmount = item.amount;
        pendingRefundCount = item.count;
      } else if (item._id === 'PROCESSED') {
        processedRefundAmount = item.amount;
        processedRefundCount = item.count;
      }
    });

    return {
      totalRefundAmount: Math.round(totalRefundAmount),
      totalRefundCount,
      pendingRefundAmount: Math.round(pendingRefundAmount),
      pendingRefundCount,
      processedRefundAmount: Math.round(processedRefundAmount),
      processedRefundCount,
    };
  }

  /**
   * Get Unreconciled / Mismatch Breakdown
   */
  static async getUnreconciledSummary(merchantId: Types.ObjectId | string): Promise<IUnreconciledSummary> {
    const mId = new Types.ObjectId(merchantId);

    const stats = await ReconciliationRecord.aggregate([
      { $match: { merchantId: mId, status: { $in: ['UNMATCHED', 'REVIEW'] } } },
      {
        $group: {
          _id: '$mismatchType',
          count: { $sum: 1 },
          amount: { $sum: '$expectedAmount' },
        },
      },
    ]);

    let unreconciledCount = 0;
    let unreconciledAmount = 0;
    let amountMismatchCount = 0;
    let amountMismatchAmount = 0;
    let settlementIdMismatchCount = 0;
    let settlementIdMismatchAmount = 0;
    let duplicateCount = 0;
    let duplicateAmount = 0;
    let orderPaymentMismatchCount = 0;
    let orderPaymentMismatchAmount = 0;
    let missingSettlementCount = 0;
    let missingSettlementAmount = 0;

    stats.forEach((item) => {
      unreconciledCount += item.count;
      unreconciledAmount += item.amount;

      switch (item._id) {
        case 'AMOUNT_MISMATCH':
          amountMismatchCount = item.count;
          amountMismatchAmount = item.amount;
          break;
        case 'SETTLEMENT_ID_MISMATCH':
          settlementIdMismatchCount = item.count;
          settlementIdMismatchAmount = item.amount;
          break;
        case 'DUPLICATE':
          duplicateCount = item.count;
          duplicateAmount = item.amount;
          break;
        case 'ORDER_PAYMENT_MISMATCH':
          orderPaymentMismatchCount = item.count;
          orderPaymentMismatchAmount = item.amount;
          break;
        case 'MISSING_SETTLEMENT':
          missingSettlementCount = item.count;
          missingSettlementAmount = item.amount;
          break;
      }
    });

    return {
      unreconciledCount,
      unreconciledAmount: Math.round(unreconciledAmount),
      amountMismatchCount,
      amountMismatchAmount: Math.round(amountMismatchAmount),
      settlementIdMismatchCount,
      settlementIdMismatchAmount: Math.round(settlementIdMismatchAmount),
      duplicateCount,
      duplicateAmount: Math.round(duplicateAmount),
      orderPaymentMismatchCount,
      orderPaymentMismatchAmount: Math.round(orderPaymentMismatchAmount),
      missingSettlementCount,
      missingSettlementAmount: Math.round(missingSettlementAmount),
    };
  }

  /**
   * Get Disputes summary
   */
  static async getDisputeSummary(merchantId: Types.ObjectId | string): Promise<IDisputeSummary> {
    const mId = new Types.ObjectId(merchantId);

    const stats = await Dispute.aggregate([
      { $match: { merchantId: mId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]);

    let totalDisputeAmount = 0;
    let totalDisputeCount = 0;
    let openDisputeAmount = 0;
    let openDisputeCount = 0;
    let underReviewCount = 0;

    stats.forEach((item) => {
      totalDisputeAmount += item.amount;
      totalDisputeCount += item.count;
      if (item._id === 'OPEN') {
        openDisputeAmount += item.amount;
        openDisputeCount += item.count;
      } else if (item._id === 'UNDER_REVIEW') {
        underReviewCount += item.count;
      }
    });

    return {
      totalDisputeAmount: Math.round(totalDisputeAmount),
      totalDisputeCount,
      openDisputeAmount: Math.round(openDisputeAmount),
      openDisputeCount,
      underReviewCount,
    };
  }

  /**
   * Calculate Financial Health Score (0 - 100) deterministically
   */
  static async calculateFinancialHealthScore(merchantId: Types.ObjectId | string): Promise<IFinancialHealthScore> {
    const settlement = await this.getSettlementSummary(merchantId);
    const payments = await this.getPaymentSummary(merchantId);
    const unreconciled = await this.getUnreconciledSummary(merchantId);
    const refunds = await this.getRefundSummary(merchantId);
    const disputes = await this.getDisputeSummary(merchantId);

    let score = 100;
    const factors: IFinancialHealthScore['factors'] = [];

    // Factor 1: Settlement Discrepancy Impact (Max 12 pts penalty)
    const settlementDiscrepancyRatio = settlement.expectedAmount > 0 
      ? settlement.difference / settlement.expectedAmount 
      : 0;
    const settlementPenalty = Math.min(12, Math.round(settlementDiscrepancyRatio * 60));
    if (settlementPenalty > 0) {
      score -= settlementPenalty;
      factors.push({
        name: 'Settlement Discrepancy',
        impact: -settlementPenalty,
        score: Math.max(0, 30 - settlementPenalty),
        description: `₹${(settlement.difference / 100000).toFixed(2)}L variance between expected and actual settlement.`,
      });
    } else {
      factors.push({
        name: 'Settlement Discrepancy',
        impact: 0,
        score: 30,
        description: 'Settlement matches expected payouts perfectly.',
      });
    }

    // Factor 2: Unreconciled Transactions Impact (Max 10 pts penalty)
    const unreconciledPenalty = Math.min(10, Math.round((unreconciled.unreconciledCount / 50) * 10));
    if (unreconciledPenalty > 0) {
      score -= unreconciledPenalty;
      factors.push({
        name: 'Unreconciled Transactions',
        impact: -unreconciledPenalty,
        score: Math.max(0, 25 - unreconciledPenalty),
        description: `${unreconciled.unreconciledCount} transactions requiring reconciliation or review.`,
      });
    } else {
      factors.push({
        name: 'Unreconciled Transactions',
        impact: 0,
        score: 25,
        description: 'All transactions successfully reconciled.',
      });
    }

    // Factor 3: Failed Payment Rate (Max 8 pts penalty)
    const failRate = payments.totalTransactions > 0 
      ? (payments.failedCount / payments.totalTransactions) * 100 
      : 0;
    const failurePenalty = Math.min(8, Math.round(failRate * 0.8));
    if (failurePenalty > 0) {
      score -= failurePenalty;
      factors.push({
        name: 'Payment Failure Rate',
        impact: -failurePenalty,
        score: Math.max(0, 20 - failurePenalty),
        description: `${failRate.toFixed(1)}% payment failures (₹${(payments.failedVolume / 1000).toFixed(0)}K lost volume).`,
      });
    } else {
      factors.push({
        name: 'Payment Failure Rate',
        impact: 0,
        score: 20,
        description: 'Optimal transaction authorization rate.',
      });
    }

    // Factor 4: Pending Refunds & Disputes (Max 6 pts penalty)
    const refundDisputePenalty = Math.min(6, (refunds.pendingRefundCount * 0.2) + (disputes.openDisputeCount * 0.5));
    const roundedRefundPenalty = Math.round(refundDisputePenalty);
    if (roundedRefundPenalty > 0) {
      score -= roundedRefundPenalty;
      factors.push({
        name: 'Refunds & Disputes',
        impact: -roundedRefundPenalty,
        score: Math.max(0, 15 - roundedRefundPenalty),
        description: `${refunds.pendingRefundCount} pending refunds, ${disputes.openDisputeCount} open disputes.`,
      });
    } else {
      factors.push({
        name: 'Refunds & Disputes',
        impact: 0,
        score: 15,
        description: 'Low refund lag and minimal chargebacks.',
      });
    }

    // Factor 5: Delayed Settlement Count (Max 5 pts penalty)
    const delayedPenalty = Math.min(5, settlement.delayedCount * 2);
    if (delayedPenalty > 0) {
      score -= delayedPenalty;
      factors.push({
        name: 'Settlement Delays',
        impact: -delayedPenalty,
        score: Math.max(0, 10 - delayedPenalty),
        description: `${settlement.delayedCount} delayed settlement batches detected.`,
      });
    } else {
      factors.push({
        name: 'Settlement Delays',
        impact: 0,
        score: 10,
        description: 'On-time settlement cycles.',
      });
    }

    // Clamp score between 0 and 100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    let rating: IFinancialHealthScore['rating'] = 'GOOD';
    if (finalScore >= 90) rating = 'EXCELLENT';
    else if (finalScore >= 75) rating = 'GOOD';
    else if (finalScore >= 60) rating = 'FAIR';
    else if (finalScore >= 40) rating = 'POOR';
    else rating = 'CRITICAL';

    return {
      score: finalScore,
      rating,
      factors,
    };
  }

  /**
   * Time series data for charts (volume, settlements, refunds)
   */
  static async getTimeSeriesData(merchantId: Types.ObjectId | string) {
    const mId = new Types.ObjectId(merchantId);

    // Group payments by date over the past 14 days
    const paymentsByDate = await Payment.aggregate([
      { $match: { merchantId: mId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          volume: { $sum: '$amount' },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, '$amount', 0] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 14 },
    ]);

    // Settlements timeline
    const settlementsByDate = await Settlement.aggregate([
      { $match: { merchantId: mId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$expectedDate' } },
          expected: { $sum: '$expectedAmount' },
          actual: { $sum: '$actualAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Reconciliation status breakdown
    const reconStatus = await ReconciliationRecord.aggregate([
      { $match: { merchantId: mId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$expectedAmount' },
        },
      },
    ]);

    return {
      paymentsTimeline: paymentsByDate.map((p) => ({
        date: p._id,
        volume: p.volume,
        successful: p.successful,
        failed: p.failed,
        count: p.count,
      })),
      settlementsTimeline: settlementsByDate.map((s) => ({
        date: s._id,
        expected: s.expected,
        actual: s.actual,
        gap: Math.max(0, s.expected - s.actual),
      })),
      reconciliationStatus: reconStatus.map((r) => ({
        status: r._id,
        count: r.count,
        amount: r.amount,
      })),
    };
  }

  /**
   * Stress test simulation calculation (deterministic)
   */
  static async runStressTest(
    merchantId: Types.ObjectId | string,
    params: {
      revenueDropPercent?: number; // e.g. 20
      refundIncreasePercent?: number; // e.g. 30
      settlementDelayDays?: number; // e.g. 2
      unexpectedExpense?: number; // e.g. 100000
    }
  ) {
    const payment = await this.getPaymentSummary(merchantId);
    const settlement = await this.getSettlementSummary(merchantId);
    const refunds = await this.getRefundSummary(merchantId);
    const health = await this.calculateFinancialHealthScore(merchantId);

    const revDrop = (params.revenueDropPercent || 0) / 100;
    const refInc = (params.refundIncreasePercent || 0) / 100;
    const delayDays = params.settlementDelayDays || 0;
    const expense = params.unexpectedExpense || 0;

    const baseRevenue = payment.successfulVolume;
    const projectedRevenue = baseRevenue * (1 - revDrop);
    const revenueLoss = baseRevenue - projectedRevenue;

    const baseRefunds = refunds.totalRefundAmount;
    const projectedRefunds = baseRefunds * (1 + refInc);
    const additionalRefundCost = projectedRefunds - baseRefunds;

    const delayedCashflow = (settlement.expectedAmount / 30) * delayDays;
    const totalImpact = revenueLoss + additionalRefundCost + expense + (delayedCashflow * 0.4);

    let projectedHealthScore = health.score - Math.round((totalImpact / (baseRevenue || 1)) * 45);
    if (delayDays > 1) projectedHealthScore -= delayDays * 4;
    projectedHealthScore = Math.max(12, Math.min(100, projectedHealthScore));

    let riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'SAFE';
    if (projectedHealthScore < 45 || totalImpact > baseRevenue * 0.35) {
      riskLevel = 'CRITICAL';
    } else if (projectedHealthScore < 65 || totalImpact > baseRevenue * 0.2) {
      riskLevel = 'HIGH';
    } else if (projectedHealthScore < 80 || totalImpact > baseRevenue * 0.08) {
      riskLevel = 'MODERATE';
    }

    return {
      originalHealthScore: health.score,
      projectedHealthScore,
      totalFinancialImpact: Math.round(totalImpact),
      riskLevel,
      breakdown: {
        revenueLoss: Math.round(revenueLoss),
        additionalRefundCost: Math.round(additionalRefundCost),
        delayedCashflow: Math.round(delayedCashflow),
        unexpectedExpense: expense,
      },
      recommendations: [
        delayDays > 0 ? `Negotiate standard T+1 settlement cycle with banking partner.` : null,
        revDrop > 0.15 ? `Buffer working capital reserves to cover at least 45 days of operational expenses.` : null,
        refInc > 0.2 ? `Audit return policy and gateway refund auto-reconciliation webhooks.` : null,
        expense > 50000 ? `Establish emergency credit buffer before disbursing merchant vendor payouts.` : null,
      ].filter(Boolean),
    };
  }
}
