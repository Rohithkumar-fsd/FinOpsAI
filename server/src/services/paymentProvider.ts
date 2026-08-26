import { PaymentMethod, PaymentStatus } from '../types';

export interface CreatePaymentRequest {
  merchantId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  simulateStatus?: PaymentStatus | 'TIMEOUT';
}

export interface PaymentResponse {
  paymentId: string;
  paymentReference: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  provider: 'MOCK' | 'RAZORPAY';
  gatewayTransactionId: string;
  failureReason?: string;
  createdAt: Date;
}

export interface IPaymentProvider {
  createPayment(req: CreatePaymentRequest): Promise<PaymentResponse>;
  refundPayment(paymentId: string, amount: number, reason: string): Promise<any>;
  verifyPayment(paymentReference: string): Promise<PaymentResponse>;
}

/**
 * MockPaymentProvider - Default implementation for demo and local execution
 */
export class MockPaymentProvider implements IPaymentProvider {
  async createPayment(req: CreatePaymentRequest): Promise<PaymentResponse> {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const paymentRef = `pay_mock_${randomSuffix}`;
    const gatewayTxnId = `gtxn_${randomSuffix}`;

    let status: PaymentStatus = 'SUCCESS';
    let failureReason: string | undefined = undefined;

    if (req.simulateStatus === 'FAILED') {
      status = 'FAILED';
      failureReason = 'Simulated: Card issuer authorization declined';
    } else if (req.simulateStatus === 'PENDING' || req.simulateStatus === 'TIMEOUT') {
      status = 'PENDING';
      failureReason = req.simulateStatus === 'TIMEOUT' ? 'Simulated: Bank gateway response timeout' : undefined;
    } else {
      status = 'SUCCESS';
    }

    return {
      paymentId: `pid_${randomSuffix}`,
      paymentReference: paymentRef,
      orderId: req.orderId,
      amount: req.amount,
      currency: req.currency || 'INR',
      status,
      paymentMethod: req.paymentMethod,
      provider: 'MOCK',
      gatewayTransactionId: gatewayTxnId,
      failureReason,
      createdAt: new Date(),
    };
  }

  async refundPayment(paymentId: string, amount: number, reason: string): Promise<any> {
    return {
      refundId: `rfnd_mock_${Math.floor(100000 + Math.random() * 900000)}`,
      paymentId,
      amount,
      reason,
      status: 'PROCESSED',
      processedAt: new Date(),
      provider: 'MOCK',
    };
  }

  async verifyPayment(paymentReference: string): Promise<PaymentResponse> {
    return {
      paymentId: `pid_${paymentReference}`,
      paymentReference,
      orderId: 'ord_mock_123',
      amount: 1000,
      currency: 'INR',
      status: 'SUCCESS',
      paymentMethod: 'UPI',
      provider: 'MOCK',
      gatewayTransactionId: `gtxn_${paymentReference}`,
      createdAt: new Date(),
    };
  }
}

/**
 * RazorpayPaymentProvider - Pluggable provider for production integration
 */
export class RazorpayPaymentProvider implements IPaymentProvider {
  private keyId?: string;
  private keySecret?: string;

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  async createPayment(req: CreatePaymentRequest): Promise<PaymentResponse> {
    if (!this.keyId || !this.keySecret) {
      console.warn('[Razorpay] Credentials not configured. Delegating to MockPaymentProvider fallback.');
      return new MockPaymentProvider().createPayment(req);
    }
    // Pluggable razorpay SDK logic
    throw new Error('Razorpay live mode requires configured key credentials in .env');
  }

  async refundPayment(paymentId: string, amount: number, reason: string): Promise<any> {
    if (!this.keyId) {
      return new MockPaymentProvider().refundPayment(paymentId, amount, reason);
    }
    throw new Error('Razorpay live mode not configured');
  }

  async verifyPayment(paymentReference: string): Promise<PaymentResponse> {
    return new MockPaymentProvider().verifyPayment(paymentReference);
  }
}

// Factory for obtaining payment provider
export const getPaymentProvider = (): IPaymentProvider => {
  return new MockPaymentProvider();
};
