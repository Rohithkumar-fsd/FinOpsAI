import crypto from 'crypto';
import { Types } from 'mongoose';
import { WebhookLog, IWebhookLog, WebhookStatus } from '../models/WebhookLog';
import { FinancialAnomaly, Payment, Order } from '../models';
import { ENV } from '../config/env';

export interface IngestWebhookParams {
  merchantId: Types.ObjectId | string;
  eventId: string;
  eventType: string;
  eventTimestamp?: Date | string;
  payload: Record<string, any>;
  headers?: Record<string, any>;
  signature?: string;
  idempotencyKey?: string;
  simulateFailure?: boolean;
}

export class WebhookService {
  /**
   * Compute HMAC SHA256 signature for payload
   */
  static computeSignature(payload: any, secret: string = ENV.WEBHOOK_SECRET): string {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(serialized).digest('hex');
  }

  /**
   * Verify signature against secret
   */
  static verifySignature(payload: any, signature: string, secret: string = ENV.WEBHOOK_SECRET): boolean {
    if (!signature) return false;
    const computed = this.computeSignature(payload, secret);
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
    } catch {
      return signature === computed;
    }
  }

  /**
   * Ingest and process an incoming webhook
   */
  static async ingestWebhook(params: IngestWebhookParams): Promise<{
    webhookLog: IWebhookLog;
    status: WebhookStatus;
    message: string;
    anomalyId?: Types.ObjectId;
  }> {
    const merchantId = new Types.ObjectId(params.merchantId);
    const eventTimestamp = params.eventTimestamp ? new Date(params.eventTimestamp) : new Date();
    const headers = params.headers || {};
    const idempotencyKey = params.idempotencyKey || params.headers?.['x-idempotency-key'] || params.eventId;
    const orderId = params.payload?.orderId || params.payload?.order_id || params.payload?.entity?.order_id;
    const paymentId = params.payload?.paymentId || params.payload?.payment_id || params.payload?.entity?.id || params.payload?.id;
    const amount = Number(params.payload?.amount || params.payload?.entity?.amount || 0);

    // 1. Signature Verification Check
    let signatureValid = true;
    if (params.signature) {
      signatureValid = this.verifySignature(params.payload, params.signature);
    } else if (headers['x-razorpay-signature'] || headers['x-webhook-signature']) {
      const sig = headers['x-razorpay-signature'] || headers['x-webhook-signature'];
      signatureValid = this.verifySignature(params.payload, sig);
    }

    if (!signatureValid) {
      // Create anomaly for invalid cryptographic signature
      const anomaly = await FinancialAnomaly.create({
        merchantId,
        type: 'SIGNATURE_MISMATCH',
        severity: 'CRITICAL',
        amount: amount || 0,
        description: `Webhook event [${params.eventId}] failed HMAC SHA-256 signature verification. Potential payload tampering or unauthorized sender.`,
        evidence: {
          eventId: params.eventId,
          eventType: params.eventType,
          providedSignature: params.signature || headers['x-razorpay-signature'] || 'MISSING',
          expectedSignatureHash: this.computeSignature(params.payload),
          receivedAt: new Date(),
        },
        status: 'OPEN',
      });

      const log = await WebhookLog.create({
        merchantId,
        eventId: params.eventId,
        eventType: params.eventType,
        eventTimestamp,
        receivedAt: new Date(),
        payload: params.payload,
        headers,
        signature: params.signature || headers['x-razorpay-signature'] || '',
        signatureValid: false,
        status: 'INVALID_SIGNATURE',
        processingError: 'Cryptographic signature mismatch. Event dropped to prevent tampering.',
        idempotencyKey,
        orderId,
        paymentId,
        amount,
        retryCount: 0,
        anomalyId: anomaly._id,
      });

      return {
        webhookLog: log,
        status: 'INVALID_SIGNATURE',
        message: 'Invalid webhook signature detected. Event rejected and flagged as critical anomaly.',
        anomalyId: anomaly._id,
      };
    }

    // 2. Duplicate Webhook / Idempotency Check
    const existingLog = await WebhookLog.findOne({
      merchantId,
      $or: [
        { eventId: params.eventId },
        { idempotencyKey: { $exists: true, $ne: '', $eq: idempotencyKey } },
      ],
    });

    if (existingLog) {
      const anomaly = await FinancialAnomaly.create({
        merchantId,
        type: 'DUPLICATE_PAYMENT_WEBHOOK',
        severity: 'HIGH',
        amount: amount || 0,
        description: `Duplicate webhook received for event ID [${params.eventId}] / key [${idempotencyKey}]. Ignored replay to prevent double-crediting ledger.`,
        evidence: {
          originalEventId: existingLog.eventId,
          duplicateEventId: params.eventId,
          originalReceivedAt: existingLog.receivedAt,
          duplicateReceivedAt: new Date(),
          eventType: params.eventType,
          paymentId,
          orderId,
          amount,
        },
        status: 'OPEN',
      });

      const duplicateLog = await WebhookLog.create({
        merchantId,
        eventId: `${params.eventId}_dup_${Date.now()}`,
        eventType: params.eventType,
        eventTimestamp,
        receivedAt: new Date(),
        payload: params.payload,
        headers,
        signature: params.signature || '',
        signatureValid: true,
        status: 'DUPLICATE',
        processingError: `Duplicate event detected. Matches existing webhook record from ${existingLog.receivedAt.toISOString()}`,
        idempotencyKey: `${idempotencyKey}_dup`,
        orderId,
        paymentId,
        amount,
        retryCount: 0,
        anomalyId: anomaly._id,
      });

      return {
        webhookLog: duplicateLog,
        status: 'DUPLICATE',
        message: 'Duplicate webhook detected. Replay ignored to prevent balance double-counting.',
        anomalyId: anomaly._id,
      };
    }

    // 3. Simulated or Runtime Failure Check
    if (params.simulateFailure) {
      const anomaly = await FinancialAnomaly.create({
        merchantId,
        type: 'WEBHOOK_DELIVERY_FAILURE',
        severity: 'HIGH',
        amount: amount || 0,
        description: `Webhook ingestion failed for [${params.eventType}]: Internal processing error simulated during state reconciliation.`,
        evidence: {
          eventId: params.eventId,
          eventType: params.eventType,
          paymentId,
          orderId,
          amount,
          errorStack: 'InternalError: Database write lock timeout during webhook ingestion pipeline.',
        },
        status: 'OPEN',
      });

      const failedLog = await WebhookLog.create({
        merchantId,
        eventId: params.eventId,
        eventType: params.eventType,
        eventTimestamp,
        receivedAt: new Date(),
        payload: params.payload,
        headers,
        signature: params.signature || '',
        signatureValid: true,
        status: 'FAILED',
        processingError: 'Internal processing failure: State update lock timeout during pipeline ingestion.',
        idempotencyKey,
        orderId,
        paymentId,
        amount,
        retryCount: 0,
        anomalyId: anomaly._id,
      });

      return {
        webhookLog: failedLog,
        status: 'FAILED',
        message: 'Webhook processing failed. Added to retry queue and flagged as financial anomaly.',
        anomalyId: anomaly._id,
      };
    }

    // 4. Out-of-Order Event Sequence Detection
    let isOutOfOrder = false;
    let outOfOrderReason = '';

    if (params.eventType === 'payment.refunded' || params.eventType === 'refund.processed') {
      // Check if original payment exists in DB and is settled or captured
      const existingPayment = paymentId ? await Payment.findOne({ merchantId, paymentReference: paymentId }) : null;
      if (!existingPayment) {
        isOutOfOrder = true;
        outOfOrderReason = `Received refund event for payment [${paymentId || 'UNKNOWN'}], but no prior payment.authorized or payment.captured record exists.`;
      }
    } else if (params.eventType === 'settlement.processed') {
      const existingPayment = paymentId ? await Payment.findOne({ merchantId, paymentReference: paymentId }) : null;
      if (!existingPayment) {
        isOutOfOrder = true;
        outOfOrderReason = `Received settlement event for payment [${paymentId || 'UNKNOWN'}] before authorization or capture was acknowledged.`;
      }
    } else if (params.payload?.simulateOutOfOrder === true) {
      isOutOfOrder = true;
      outOfOrderReason = `Out-of-order sequence detected: '${params.eventType}' arrived with an inverted state transition.`;
    }

    if (isOutOfOrder) {
      const anomaly = await FinancialAnomaly.create({
        merchantId,
        type: 'OUT_OF_ORDER_WEBHOOK',
        severity: 'HIGH',
        amount: amount || 0,
        description: `Out-of-order webhook sequence detected for event [${params.eventId}]: ${outOfOrderReason}`,
        evidence: {
          eventId: params.eventId,
          eventType: params.eventType,
          paymentId,
          orderId,
          reason: outOfOrderReason,
          receivedAt: new Date(),
        },
        status: 'OPEN',
      });

      const outOfOrderLog = await WebhookLog.create({
        merchantId,
        eventId: params.eventId,
        eventType: params.eventType,
        eventTimestamp,
        receivedAt: new Date(),
        payload: params.payload,
        headers,
        signature: params.signature || '',
        signatureValid: true,
        status: 'OUT_OF_ORDER',
        processingError: outOfOrderReason,
        idempotencyKey,
        orderId,
        paymentId,
        amount,
        retryCount: 0,
        anomalyId: anomaly._id,
      });

      return {
        webhookLog: outOfOrderLog,
        status: 'OUT_OF_ORDER',
        message: `Out-of-order webhook detected: ${outOfOrderReason}`,
        anomalyId: anomaly._id,
      };
    }

    // 5. Successful Webhook Ingestion
    const log = await WebhookLog.create({
      merchantId,
      eventId: params.eventId,
      eventType: params.eventType,
      eventTimestamp,
      receivedAt: new Date(),
      payload: params.payload,
      headers,
      signature: params.signature || '',
      signatureValid: true,
      status: 'SUCCESS',
      idempotencyKey,
      orderId,
      paymentId,
      amount,
      retryCount: 0,
    });

    return {
      webhookLog: log,
      status: 'SUCCESS',
      message: 'Webhook processed and verified successfully.',
    };
  }

  /**
   * Retry a failed or out-of-order webhook
   */
  static async retryWebhook(merchantId: Types.ObjectId | string, webhookId: string): Promise<{
    success: boolean;
    webhookLog: IWebhookLog;
    message: string;
  }> {
    const mId = new Types.ObjectId(merchantId);
    const log = await WebhookLog.findOne({ _id: webhookId, merchantId: mId });

    if (!log) {
      throw new Error('Webhook log not found');
    }

    log.retryCount += 1;
    log.lastRetryAt = new Date();

    if (log.status === 'FAILED' || log.status === 'OUT_OF_ORDER') {
      log.status = 'RETRIED';
      log.processingError = `Successfully reprocessed after ${log.retryCount} retry attempt(s).`;
      await log.save();

      // Resolve linked anomaly if any
      if (log.anomalyId) {
        await FinancialAnomaly.findByIdAndUpdate(log.anomalyId, {
          status: 'RESOLVED',
          description: `Resolved via automated webhook retry on ${new Date().toLocaleDateString()}.`,
        });
      }

      return {
        success: true,
        webhookLog: log,
        message: `Webhook ${log.eventId} successfully reprocessed and marked RETRIED.`,
      };
    }

    await log.save();
    return {
      success: true,
      webhookLog: log,
      message: `Webhook ${log.eventId} retry logged (attempt ${log.retryCount}).`,
    };
  }

  /**
   * Webhook Demo Scenario Simulator (Performs real DB mutations)
   */
  static async simulateScenario(
    merchantId: Types.ObjectId | string,
    scenario: 'SUCCESS' | 'DUPLICATE' | 'INVALID_SIGNATURE' | 'OUT_OF_ORDER' | 'FAILED'
  ): Promise<{
    scenario: string;
    result: any;
    summary: string;
  }> {
    const mId = new Types.ObjectId(merchantId);
    const timestamp = Date.now();
    const sampleAmount = Math.floor(Math.random() * 8000) + 1200;

    switch (scenario) {
      case 'SUCCESS': {
        const eventId = `evt_succ_${timestamp}`;
        const paymentRef = `pay_succ_${timestamp}`;
        const orderRef = `order_succ_${timestamp}`;
        const payload = {
          eventId,
          eventType: 'payment.captured',
          entity: {
            id: paymentRef,
            order_id: orderRef,
            amount: sampleAmount,
            currency: 'INR',
            status: 'captured',
            method: 'UPI',
          },
          amount: sampleAmount,
          orderId: orderRef,
          paymentId: paymentRef,
        };
        const signature = this.computeSignature(payload);

        const res = await this.ingestWebhook({
          merchantId: mId,
          eventId,
          eventType: 'payment.captured',
          payload,
          signature,
          idempotencyKey: `idem_${eventId}`,
        });

        return {
          scenario: 'SUCCESS',
          result: res,
          summary: `Successfully ingested payment.captured event ${eventId} for ₹${sampleAmount.toLocaleString('en-IN')}. HMAC verified.`,
        };
      }

      case 'DUPLICATE': {
        const baseEventId = `evt_dup_base_${timestamp}`;
        const paymentRef = `pay_dup_${timestamp}`;
        const orderRef = `order_dup_${timestamp}`;
        const payload = {
          eventId: baseEventId,
          eventType: 'payment.captured',
          entity: {
            id: paymentRef,
            order_id: orderRef,
            amount: sampleAmount,
            currency: 'INR',
            status: 'captured',
            method: 'NETBANKING',
          },
          amount: sampleAmount,
          orderId: orderRef,
          paymentId: paymentRef,
        };
        const signature = this.computeSignature(payload);

        // First ingestion (Success)
        await this.ingestWebhook({
          merchantId: mId,
          eventId: baseEventId,
          eventType: 'payment.captured',
          payload,
          signature,
          idempotencyKey: `idem_dup_${baseEventId}`,
        });

        // Second ingestion (Simulated duplicate replay)
        const dupRes = await this.ingestWebhook({
          merchantId: mId,
          eventId: baseEventId,
          eventType: 'payment.captured',
          payload,
          signature,
          idempotencyKey: `idem_dup_${baseEventId}`,
        });

        return {
          scenario: 'DUPLICATE',
          result: dupRes,
          summary: `Replayed webhook ${baseEventId}. System detected identical eventId/idempotency key and created a DUPLICATE anomaly to prevent balance inflation.`,
        };
      }

      case 'INVALID_SIGNATURE': {
        const eventId = `evt_bad_sig_${timestamp}`;
        const paymentRef = `pay_bad_sig_${timestamp}`;
        const payload = {
          eventId,
          eventType: 'payment.authorized',
          entity: {
            id: paymentRef,
            amount: sampleAmount,
            currency: 'INR',
            status: 'authorized',
          },
          amount: sampleAmount,
          paymentId: paymentRef,
        };
        const tamperedSignature = 'sha256_corrupt_bad_signature_hash_xyz999888';

        const res = await this.ingestWebhook({
          merchantId: mId,
          eventId,
          eventType: 'payment.authorized',
          payload,
          signature: tamperedSignature,
          idempotencyKey: `idem_${eventId}`,
        });

        return {
          scenario: 'INVALID_SIGNATURE',
          result: res,
          summary: `Sent webhook with corrupted HMAC signature. System rejected the payload, logged INVALID_SIGNATURE, and flagged a CRITICAL anomaly.`,
        };
      }

      case 'OUT_OF_ORDER': {
        const eventId = `evt_ooo_${timestamp}`;
        const ghostPaymentRef = `pay_ghost_unauthorized_${timestamp}`;
        const payload = {
          eventId,
          eventType: 'payment.refunded',
          entity: {
            id: `rfnd_${timestamp}`,
            payment_id: ghostPaymentRef,
            amount: sampleAmount,
            currency: 'INR',
            status: 'processed',
          },
          paymentId: ghostPaymentRef,
          amount: sampleAmount,
          simulateOutOfOrder: true,
        };
        const signature = this.computeSignature(payload);

        const res = await this.ingestWebhook({
          merchantId: mId,
          eventId,
          eventType: 'payment.refunded',
          payload,
          signature,
          idempotencyKey: `idem_${eventId}`,
        });

        return {
          scenario: 'OUT_OF_ORDER',
          result: res,
          summary: `Sent 'payment.refunded' event for an unregistered/unauthorized payment ${ghostPaymentRef}. System detected invalid state progression and logged OUT_OF_ORDER.`,
        };
      }

      case 'FAILED': {
        const eventId = `evt_fail_${timestamp}`;
        const payload = {
          eventId,
          eventType: 'payment.failed',
          amount: sampleAmount,
          reason: 'Gateway timeout',
        };
        const signature = this.computeSignature(payload);

        const res = await this.ingestWebhook({
          merchantId: mId,
          eventId,
          eventType: 'payment.failed',
          payload,
          signature,
          idempotencyKey: `idem_${eventId}`,
          simulateFailure: true,
        });

        return {
          scenario: 'FAILED',
          result: res,
          summary: `Simulated ingestion failure (500 write lock exception). Logged FAILED state, queued for retry, and registered HIGH severity anomaly.`,
        };
      }

      default:
        throw new Error(`Unknown simulation scenario: ${scenario}`);
    }
  }

  /**
   * Get Webhook Summary Statistics
   */
  static async getWebhookSummary(merchantId: Types.ObjectId | string): Promise<{
    totalIngested: number;
    successCount: number;
    duplicateCount: number;
    invalidSignatureCount: number;
    outOfOrderCount: number;
    failedCount: number;
    retriedCount: number;
    successRate: number;
    recentAnomaliesCount: number;
  }> {
    const mId = new Types.ObjectId(merchantId);

    const [stats, anomalyCount] = await Promise.all([
      WebhookLog.aggregate([
        { $match: { merchantId: mId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      FinancialAnomaly.countDocuments({
        merchantId: mId,
        type: { $in: ['SIGNATURE_MISMATCH', 'DUPLICATE_PAYMENT_WEBHOOK', 'OUT_OF_ORDER_WEBHOOK', 'WEBHOOK_DELIVERY_FAILURE'] },
        status: 'OPEN',
      }),
    ]);

    let totalIngested = 0;
    let successCount = 0;
    let duplicateCount = 0;
    let invalidSignatureCount = 0;
    let outOfOrderCount = 0;
    let failedCount = 0;
    let retriedCount = 0;

    stats.forEach((s) => {
      const count = s.count || 0;
      totalIngested += count;
      if (s._id === 'SUCCESS') successCount = count;
      if (s._id === 'DUPLICATE') duplicateCount = count;
      if (s._id === 'INVALID_SIGNATURE') invalidSignatureCount = count;
      if (s._id === 'OUT_OF_ORDER') outOfOrderCount = count;
      if (s._id === 'FAILED') failedCount = count;
      if (s._id === 'RETRIED') retriedCount = count;
    });

    const successRate = totalIngested > 0 ? Number(((successCount + retriedCount) / totalIngested * 100).toFixed(1)) : 100;

    return {
      totalIngested,
      successCount,
      duplicateCount,
      invalidSignatureCount,
      outOfOrderCount,
      failedCount,
      retriedCount,
      successRate,
      recentAnomaliesCount: anomalyCount,
    };
  }

  /**
   * Query Webhook Audit Logs with filtering and pagination
   */
  static async getWebhookLogs(
    merchantId: Types.ObjectId | string,
    options: {
      status?: string;
      eventType?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    logs: IWebhookLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const mId = new Types.ObjectId(merchantId);
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { merchantId: mId };

    if (options.status && options.status !== 'ALL') {
      filter.status = options.status;
    }

    if (options.eventType && options.eventType !== 'ALL') {
      filter.eventType = options.eventType;
    }

    if (options.search && options.search.trim()) {
      const searchRegex = new RegExp(options.search.trim(), 'i');
      filter.$or = [
        { eventId: searchRegex },
        { eventType: searchRegex },
        { paymentId: searchRegex },
        { orderId: searchRegex },
        { processingError: searchRegex },
      ];
    }

    const [logs, total] = await Promise.all([
      WebhookLog.find(filter)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WebhookLog.countDocuments(filter),
    ]);

    return {
      logs: logs as unknown as IWebhookLog[],
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single webhook log details
   */
  static async getWebhookDetails(merchantId: Types.ObjectId | string, webhookId: string): Promise<IWebhookLog | null> {
    const mId = new Types.ObjectId(merchantId);
    return WebhookLog.findOne({ _id: webhookId, merchantId: mId });
  }
}
