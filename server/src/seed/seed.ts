import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  Merchant,
  Customer,
  Order,
  Payment,
  Refund,
  Settlement,
  SettlementItem,
  Dispute,
  ReconciliationRecord,
  FinancialAnomaly,
  AgentInvestigation,
  AgentAction,
  WebhookLog,
} from '../models';
import { connectDB, disconnectDB } from '../config/db';

export const seedDatabase = async (): Promise<any> => {
  console.log('[Seed] Starting deterministic database population...');

  // 1. Clear existing collections
  await Promise.all([
    Merchant.deleteMany({}),
    Customer.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
    Refund.deleteMany({}),
    Settlement.deleteMany({}),
    SettlementItem.deleteMany({}),
    Dispute.deleteMany({}),
    ReconciliationRecord.deleteMany({}),
    FinancialAnomaly.deleteMany({}),
    AgentInvestigation.deleteMany({}),
    AgentAction.deleteMany({}),
    WebhookLog.deleteMany({}),
  ]);

  console.log('[Seed] Collections cleared.');

  // 2. Create Demo Merchant
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Demo@12345', salt);

  const merchant = await Merchant.create({
    _id: new Types.ObjectId('65a123456789012345678901'),
    name: 'NovaKart',
    email: 'merchant@novakart.demo',
    passwordHash,
    currency: 'INR',
  });

  console.log(`[Seed] Demo Merchant created: ${merchant.name} (${merchant.email})`);

  // 3. Create Customers (e.g. 200 customers)
  const customersData: any[] = [];
  const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Gauri', 'Isha', 'Kavya', 'Meera', 'Pooja', 'Riya', 'Saanvi', 'Tanvi'];
  const lastNames = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Mehta', 'Gupta', 'Singh', 'Kumar', 'Nair', 'Iyer', 'Joshi', 'Chopra', 'Malhotra', 'Bhat', 'Deshmukh'];

  for (let i = 1; i <= 200; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    customersData.push({
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@demo-mail.com`,
      phone: `+91${9800000000 + i}`,
      createdAt: new Date(Date.now() - (30 - (i % 30)) * 86400000),
    });
  }
  const createdCustomers = await Customer.insertMany(customersData);
  console.log(`[Seed] Created ${createdCustomers.length} customers.`);

  // 4. Create 10,050 Orders & Payments (deterministic)
  // Target:
  // - Total Payment Volume: ~₹48,50,000+
  // - Settled Payments: ~₹21,60,000
  // - Expected Settlements: ₹24,80,000
  // - Discrepancy: ₹3,20,000
  // - Unreconciled: 47 records (worth ₹2,41,400)
  //   * 31 Settlement ID mismatches (total ₹1,82,400)
  //   * 7 Amount mismatches (total ₹39,000)
  //   * 9 Duplicates (total ₹20,000)
  // - Failed payments: ~25 transactions (~₹54,000)
  // - Pending refunds: 12 transactions (~₹25,000)
  // - Open disputes: 6 transactions (~₹18,000)

  const TOTAL_TRANSACTIONS = 10050;
  const ordersData: any[] = [];
  const paymentsData: any[] = [];
  const paymentMethods = ['UPI', 'CARD', 'NETBANKING', 'WALLET'];

  // Let's create the 47 specific problem transactions first
  const problemRecordsConfig = [
    // 31 Settlement ID Mismatch (Average ~₹5,883 -> total = 182,400)
    ...Array.from({ length: 31 }, (_, i) => ({
      index: i + 1,
      type: 'SETTLEMENT_ID_MISMATCH',
      amount: i === 0 ? 6400 : (i === 30 ? 5000 : 5800 + (i % 5) * 100),
      paymentMethod: paymentMethods[i % 4],
      status: 'SUCCESS',
    })),
    // 7 Amount Mismatch (Total = 39,000)
    ...Array.from({ length: 7 }, (_, i) => ({
      index: 32 + i,
      type: 'AMOUNT_MISMATCH',
      amount: [4000, 6000, 5000, 8000, 4500, 5500, 6000][i],
      actualSettled: [3800, 5600, 4800, 7500, 4200, 5200, 5700][i],
      paymentMethod: paymentMethods[i % 4],
      status: 'SUCCESS',
    })),
    // 9 Duplicate Mappings (Total = 20,000)
    ...Array.from({ length: 9 }, (_, i) => ({
      index: 39 + i,
      type: 'DUPLICATE',
      amount: [2000, 2500, 1500, 3000, 2000, 2500, 2000, 2500, 2000][i],
      paymentMethod: paymentMethods[i % 4],
      status: 'SUCCESS',
    })),
  ];

  // Adjust total exact values for the 47 problem records
  // 31 items total: 182400
  // 7 items total: 39000
  // 9 items total: 20000
  // Sum = 241400

  const problemPaymentsMap = new Map<number, any>();

  problemRecordsConfig.forEach((p) => {
    problemPaymentsMap.set(p.index, p);
  });

  const now = Date.now();
  const past30Days = 30 * 86400000;

  for (let i = 1; i <= TOTAL_TRANSACTIONS; i++) {
    const cust = createdCustomers[i % createdCustomers.length];
    const orderId = new Types.ObjectId();
    const paymentId = new Types.ObjectId();
    const isProblem = problemPaymentsMap.get(i);

    const createdAt = new Date(now - (past30Days * (1 - i / TOTAL_TRANSACTIONS)));

    let amount = 0;
    let paymentMethod = paymentMethods[i % 4];
    let status = 'SUCCESS';
    let failureReason = undefined;
    let settledAt: Date | undefined = new Date(createdAt.getTime() + 86400000);

    if (isProblem) {
      amount = isProblem.amount;
      paymentMethod = isProblem.paymentMethod;
      status = isProblem.status;
      settledAt = undefined; // Problem records are not settled or have mismatch
    } else if (i > 47 && i <= 47 + 25) {
      // 25 Failed Payments (~₹54,000)
      amount = [2100, 2500, 1800, 3200, 1500, 2400, 1900, 2800, 2200, 1700, 2600, 1900, 2100, 2300, 2000, 2400, 1800, 2200, 1900, 2500, 2100, 2200, 1800, 2400, 2300][i - 48] || 2160;
      status = 'FAILED';
      failureReason = i % 2 === 0 ? 'Card authorization declined by issuer' : 'UPI intent timeout / VPA bank server unreachable';
      settledAt = undefined;
    } else if (i > 72 && i <= 72 + 12) {
      // 12 Pending Refund payments (~₹25,000)
      amount = [2000, 2500, 1800, 2200, 2100, 1900, 2400, 2000, 1800, 2300, 2100, 1900][i - 73] || 2083;
      status = 'REFUNDED';
      settledAt = new Date(createdAt.getTime() + 86400000);
    } else if (i > 84 && i <= 84 + 6) {
      // 6 Dispute payments (~₹18,000)
      amount = 3000;
      status = 'SUCCESS';
      settledAt = new Date(createdAt.getTime() + 86400000);
    } else {
      // Normal transactions: average around ₹300 - ₹800
      amount = 250 + ((i * 17) % 650);
      status = 'SUCCESS';
      settledAt = new Date(createdAt.getTime() + 86400000);
    }

    const orderRef = `ORD-2026-${String(10000 + i)}`;
    const paymentRef = `PAY-2026-${String(10000 + i)}`;

    ordersData.push({
      _id: orderId,
      merchantId: merchant._id,
      customerId: cust._id,
      orderReference: orderRef,
      amount,
      currency: 'INR',
      status: status === 'SUCCESS' ? 'PAID' : (status === 'FAILED' ? 'FAILED' : 'PROCESSING'),
      createdAt,
    });

    paymentsData.push({
      _id: paymentId,
      merchantId: merchant._id,
      orderId,
      paymentReference: paymentRef,
      amount,
      currency: 'INR',
      paymentMethod,
      status,
      failureReason,
      createdAt,
      settledAt,
    });
  }

  console.log(`[Seed] Inserting ${ordersData.length} Orders & ${paymentsData.length} Payments in chunks...`);
  await Order.collection.insertMany(ordersData as any);
  await Payment.collection.insertMany(paymentsData as any);
  console.log('[Seed] Orders and Payments inserted successfully.');

  // 5. Create Settlements and Settlement Items
  // Target: Expected ₹24,80,000, Actual ₹21,60,000 (Difference: ₹3,20,000)
  const settlementsData = [
    {
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      settlementReference: 'SETTLE-2026-AUG-B1',
      expectedAmount: 1200000,
      actualAmount: 1200000,
      expectedDate: new Date(now - 10 * 86400000),
      actualDate: new Date(now - 10 * 86400000),
      status: 'SETTLED',
    },
    {
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      settlementReference: 'SETTLE-2026-AUG-B2',
      expectedAmount: 1280000,
      actualAmount: 960000, // ₹3,20,000 gap!
      expectedDate: new Date(now - 2 * 86400000),
      actualDate: new Date(now - 2 * 86400000),
      status: 'PARTIAL',
    },
  ];
  await Settlement.insertMany(settlementsData);
  console.log('[Seed] Settlements created.');

  // 6. Create Refunds (12 Pending = ₹25,000, + 15 Processed)
  const refundsData: any[] = [];
  for (let i = 1; i <= 12; i++) {
    const payment = paymentsData[72 + i - 1];
    refundsData.push({
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      paymentId: payment._id,
      amount: payment.amount,
      status: 'PENDING',
      reason: i % 2 === 0 ? 'Customer requested order return' : 'Defective product / size mismatch',
      requestedAt: new Date(now - (12 - i) * 3600000 * 4),
    });
  }
  for (let i = 1; i <= 15; i++) {
    const payment = paymentsData[100 + i];
    refundsData.push({
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      paymentId: payment._id,
      amount: payment.amount,
      status: 'PROCESSED',
      reason: 'Customer requested order cancellation before dispatch',
      requestedAt: new Date(now - (20 - i) * 86400000),
      processedAt: new Date(now - (19 - i) * 86400000),
    });
  }
  await Refund.insertMany(refundsData);
  console.log(`[Seed] Created ${refundsData.length} refunds (12 Pending).`);

  // 7. Create Disputes (6 Open = ₹18,000)
  const disputesData: any[] = [];
  for (let i = 1; i <= 6; i++) {
    const payment = paymentsData[84 + i - 1];
    disputesData.push({
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      paymentId: payment._id,
      amount: payment.amount,
      reason: i % 2 === 0 ? 'Cardholder claims unauthorized transaction' : 'Merchandise not received by delivery cutoff',
      status: 'OPEN',
      createdAt: new Date(now - (7 - i) * 86400000),
    });
  }
  await Dispute.insertMany(disputesData);
  console.log(`[Seed] Created ${disputesData.length} disputes.`);

  // 8. Create Reconciliation Records
  // - 47 Unmatched records
  //   * 31 Settlement ID mismatch (Expected amount = ₹1,82,400)
  //   * 7 Amount mismatch (Expected amount = ₹39,000, difference = ~₹2,700)
  //   * 9 Duplicates (Expected amount = ₹20,000)
  // - 50 Matched baseline records
  const reconData: any[] = [];

  // 31 Settlement ID Mismatch
  for (let i = 0; i < 31; i++) {
    const payment = paymentsData[i];
    const order = ordersData[i];
    reconData.push({
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      orderId: order._id,
      paymentId: payment._id,
      status: 'UNMATCHED',
      mismatchType: 'SETTLEMENT_ID_MISMATCH',
      expectedAmount: payment.amount,
      actualAmount: 0,
      difference: payment.amount,
      evidence: {
        paymentReference: payment.paymentReference,
        orderReference: order.orderReference,
        expectedBatch: 'SETTLE-2026-AUG-B2',
        gatewayStatus: 'CAPTURED',
        bankUtrStatus: 'PENDING_MAP',
        matchingRule: 'Payment reference + order reference + settlement window',
        confidenceScore: 0.94,
      },
      createdAt: payment.createdAt,
      updatedAt: payment.createdAt,
    });
  }

  // 7 Amount Mismatch
  for (let i = 0; i < 7; i++) {
    const payment = paymentsData[31 + i];
    const order = ordersData[31 + i];
    const actual = isNaN(payment.amount - 300) ? payment.amount * 0.95 : payment.amount - 300;
    reconData.push({
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      orderId: order._id,
      paymentId: payment._id,
      status: 'UNMATCHED',
      mismatchType: 'AMOUNT_MISMATCH',
      expectedAmount: payment.amount,
      actualAmount: actual,
      difference: payment.amount - actual,
      evidence: {
        paymentReference: payment.paymentReference,
        orderReference: order.orderReference,
        authorizedGross: payment.amount,
        settledNet: actual,
        feeVarianceDetected: true,
        matchingRule: 'Gross authorized amount vs settled net payout',
        confidenceScore: 0.91,
      },
      createdAt: payment.createdAt,
      updatedAt: payment.createdAt,
    });
  }

  // 9 Duplicate Mappings
  for (let i = 0; i < 9; i++) {
    const payment = paymentsData[38 + i];
    const order = ordersData[38 + i];
    reconData.push({
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      orderId: order._id,
      paymentId: payment._id,
      status: 'UNMATCHED',
      mismatchType: 'DUPLICATE',
      expectedAmount: payment.amount,
      actualAmount: 0,
      difference: payment.amount,
      evidence: {
        paymentReference: payment.paymentReference,
        orderReference: order.orderReference,
        duplicateAttemptCount: 2,
        matchingRule: 'Duplicate payment reference mapping across identical order ID',
        confidenceScore: 0.89,
      },
      createdAt: payment.createdAt,
      updatedAt: payment.createdAt,
    });
  }

  // 50 Matched baseline records
  for (let i = 0; i < 50; i++) {
    const payment = paymentsData[200 + i];
    const order = ordersData[200 + i];
    reconData.push({
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      orderId: order._id,
      paymentId: payment._id,
      status: 'MATCHED',
      mismatchType: 'NONE',
      expectedAmount: payment.amount,
      actualAmount: payment.amount,
      difference: 0,
      evidence: {
        paymentReference: payment.paymentReference,
        orderReference: order.orderReference,
        matchingRule: 'Exact match (Reference, amount, timestamp)',
        confidenceScore: 1.0,
      },
      createdAt: payment.createdAt,
      updatedAt: payment.createdAt,
    });
  }

  await ReconciliationRecord.insertMany(reconData);
  console.log(`[Seed] Created ${reconData.length} reconciliation records (47 unmatched).`);

  // 9. Create Financial Anomalies
  const anomaliesData = [
    {
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      type: 'SETTLEMENT_DISCREPANCY',
      severity: 'CRITICAL',
      amount: 320000,
      description: 'Major settlement variance: Expected ₹24.80L vs Actual ₹21.60L in batch SETTLE-2026-AUG-B2.',
      evidence: {
        expected: 2480000,
        actual: 2160000,
        discrepancy: 320000,
        affectedBatch: 'SETTLE-2026-AUG-B2',
      },
      status: 'OPEN',
      detectedAt: new Date(now - 12 * 3600000),
    },
    {
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      type: 'AMOUNT_MISMATCH_CLUSTER',
      severity: 'HIGH',
      amount: 39000,
      description: '7 transactions exhibit authorized amount vs settled net variance exceeding standard gateway MDR fees.',
      evidence: {
        count: 7,
        totalVariance: 39000,
      },
      status: 'OPEN',
      detectedAt: new Date(now - 18 * 3600000),
    },
    {
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      type: 'FAILED_PAYMENT_SPIKE',
      severity: 'MEDIUM',
      amount: 54000,
      description: '25 payment attempts failed due to bank server authorization drop-offs.',
      evidence: {
        failedCount: 25,
        totalFailedVolume: 54000,
      },
      status: 'OPEN',
      detectedAt: new Date(now - 24 * 3600000),
    },
    {
      _id: new Types.ObjectId(),
      merchantId: merchant._id,
      type: 'PENDING_REFUND_LAG',
      severity: 'MEDIUM',
      amount: 25000,
      description: '12 customer return refunds pending processing for more than 48 hours.',
      evidence: {
        count: 12,
        pendingAmount: 25000,
      },
      status: 'OPEN',
      detectedAt: new Date(now - 30 * 3600000),
    },
  ];
  await FinancialAnomaly.insertMany(anomaliesData);
  console.log(`[Seed] Created ${anomaliesData.length} financial anomalies.`);

  // 10. Seed Webhook Audit Logs
  const webhooksData: any[] = [];
  const eventTypes = ['payment.captured', 'payment.authorized', 'payment.failed', 'order.paid', 'refund.created'];

  // Seed 40 successful webhooks
  for (let i = 1; i <= 40; i++) {
    const eType = eventTypes[i % eventTypes.length];
    const eId = `evt_demo_seed_${1000 + i}`;
    const pId = `pay_seed_${2000 + i}`;
    const oId = `order_seed_${3000 + i}`;
    const amt = 1500 + (i % 10) * 450;
    const time = new Date(now - i * 3600000);

    webhooksData.push({
      merchantId: merchant._id,
      eventId: eId,
      eventType: eType,
      eventTimestamp: time,
      receivedAt: time,
      payload: {
        eventId: eId,
        eventType: eType,
        entity: { id: pId, order_id: oId, amount: amt, status: 'captured' },
        amount: amt,
      },
      headers: { 'x-razorpay-signature': `mock_valid_hmac_sig_${i}` },
      signature: `mock_valid_hmac_sig_${i}`,
      signatureValid: true,
      status: 'SUCCESS',
      idempotencyKey: `idem_${eId}`,
      orderId: oId,
      paymentId: pId,
      amount: amt,
      retryCount: 0,
    });
  }

  // Seed 3 Duplicate Webhooks
  for (let i = 1; i <= 3; i++) {
    const originalEventId = `evt_demo_seed_${1000 + i}`;
    webhooksData.push({
      merchantId: merchant._id,
      eventId: `${originalEventId}_dup_replay`,
      eventType: 'payment.captured',
      eventTimestamp: new Date(now - i * 1800000),
      receivedAt: new Date(now - i * 1800000),
      payload: {
        eventId: originalEventId,
        eventType: 'payment.captured',
        entity: { id: `pay_seed_${2000 + i}`, amount: 3500 },
        amount: 3500,
      },
      headers: { 'x-razorpay-signature': 'mock_valid_hmac_sig' },
      signature: 'mock_valid_hmac_sig',
      signatureValid: true,
      status: 'DUPLICATE',
      processingError: `Duplicate event detected. Matches existing webhook record [${originalEventId}].`,
      idempotencyKey: `idem_${originalEventId}_dup`,
      paymentId: `pay_seed_${2000 + i}`,
      amount: 3500,
      retryCount: 0,
    });
  }

  // Seed 2 Invalid Signature Webhooks
  for (let i = 1; i <= 2; i++) {
    webhooksData.push({
      merchantId: merchant._id,
      eventId: `evt_bad_sig_${i}`,
      eventType: 'payment.captured',
      eventTimestamp: new Date(now - i * 7200000),
      receivedAt: new Date(now - i * 7200000),
      payload: {
        eventId: `evt_bad_sig_${i}`,
        eventType: 'payment.captured',
        amount: 5400,
      },
      headers: { 'x-razorpay-signature': 'invalid_forged_signature_xyz' },
      signature: 'invalid_forged_signature_xyz',
      signatureValid: false,
      status: 'INVALID_SIGNATURE',
      processingError: 'Cryptographic HMAC signature mismatch. Dropped event to prevent ledger tampering.',
      idempotencyKey: `idem_bad_sig_${i}`,
      amount: 5400,
      retryCount: 0,
    });
  }

  // Seed 2 Out of Order Webhooks
  for (let i = 1; i <= 2; i++) {
    webhooksData.push({
      merchantId: merchant._id,
      eventId: `evt_ooo_${i}`,
      eventType: 'payment.refunded',
      eventTimestamp: new Date(now - i * 5400000),
      receivedAt: new Date(now - i * 5400000),
      payload: {
        eventId: `evt_ooo_${i}`,
        eventType: 'payment.refunded',
        paymentId: `pay_ghost_unknown_${i}`,
        amount: 4200,
      },
      headers: { 'x-razorpay-signature': 'valid_sig_ooo' },
      signature: 'valid_sig_ooo',
      signatureValid: true,
      status: 'OUT_OF_ORDER',
      processingError: `Received refund event for unknown/unauthorized payment reference [pay_ghost_unknown_${i}].`,
      idempotencyKey: `idem_ooo_${i}`,
      paymentId: `pay_ghost_unknown_${i}`,
      amount: 4200,
      retryCount: 0,
    });
  }

  // Seed 2 Failed Webhooks
  for (let i = 1; i <= 2; i++) {
    webhooksData.push({
      merchantId: merchant._id,
      eventId: `evt_failed_${i}`,
      eventType: 'payment.failed',
      eventTimestamp: new Date(now - i * 10800000),
      receivedAt: new Date(now - i * 10800000),
      payload: {
        eventId: `evt_failed_${i}`,
        eventType: 'payment.failed',
        amount: 2900,
      },
      headers: { 'x-razorpay-signature': 'valid_sig_failed' },
      signature: 'valid_sig_failed',
      signatureValid: true,
      status: 'FAILED',
      processingError: 'Database write lock timeout during webhook ingestion pipeline.',
      idempotencyKey: `idem_failed_${i}`,
      amount: 2900,
      retryCount: 1,
      lastRetryAt: new Date(now - i * 3600000),
    });
  }

  await WebhookLog.insertMany(webhooksData);
  console.log(`[Seed] Created ${webhooksData.length} webhook audit records.`);

  console.log('[Seed] Deterministic demo dataset seeded successfully!');
  return {
    merchantId: merchant._id,
    merchantEmail: merchant.email,
    transactionsCount: TOTAL_TRANSACTIONS,
    unreconciledCount: 47,
    webhooksCount: webhooksData.length,
  };
};

// If run directly from CLI
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Seed] Error seeding database:', err);
      process.exit(1);
    }
  })();
}
