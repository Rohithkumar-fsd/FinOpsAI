import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Payment, Order, Customer, ReconciliationRecord } from '../models';
import { MockPaymentProvider } from '../services/paymentProvider';

export class PaymentsController {
  static async getPayments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const status = req.query.status as string;
      const method = req.query.method as string;
      const search = req.query.search as string;

      const query: any = { merchantId };

      if (status && status !== 'ALL') {
        query.status = status;
      }

      if (method && method !== 'ALL') {
        query.paymentMethod = method;
      }

      if (search && search.trim() !== '') {
        const regex = new RegExp(search.trim(), 'i');
        // Find matching orders first if searching by order reference
        const matchingOrders = await Order.find({ merchantId, orderReference: regex }).select('_id');
        const orderIds = matchingOrders.map((o) => o._id);

        query.$or = [
          { paymentReference: regex },
          { failureReason: regex },
          { orderId: { $in: orderIds } },
        ];
      }

      const [payments, total] = await Promise.all([
        Payment.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('orderId')
          .lean(),
        Payment.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          payments,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err: any) {
      console.error('[Payments] Error listing payments:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getPaymentById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const { id } = req.params;

      const payment = await Payment.findOne({
        _id: new Types.ObjectId(id as string),
        merchantId,
      })
        .populate({
          path: 'orderId',
          populate: { path: 'customerId' },
        })
        .lean();

      if (!payment) {
        res.status(404).json({ success: false, message: 'Payment record not found' });
        return;
      }

      const reconciliation = await ReconciliationRecord.findOne({
        merchantId,
        paymentId: payment._id,
      }).lean();

      res.status(200).json({
        success: true,
        data: {
          payment,
          reconciliation,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createMockPayment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const { amount, currency = 'INR', paymentMethod = 'UPI', simulateStatus = 'SUCCESS', customerName = 'Demo Customer' } = req.body;

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        res.status(400).json({ success: false, message: 'Valid positive payment amount is required' });
        return;
      }

      // Create or pick demo customer
      let customer = await Customer.findOne({ merchantId });
      if (!customer) {
        customer = await Customer.create({
          merchantId,
          name: customerName,
          email: 'demo.customer@novakart.demo',
          phone: '+919988776655',
        });
      }

      // Create Order
      const orderRef = `ORD-DEMO-${Date.now()}`;
      const order = await Order.create({
        merchantId,
        customerId: customer._id,
        orderReference: orderRef,
        amount: Number(amount),
        currency,
        status: simulateStatus === 'SUCCESS' ? 'PAID' : (simulateStatus === 'FAILED' ? 'FAILED' : 'PENDING'),
      });

      // Call payment provider
      const provider = new MockPaymentProvider();
      const mockResult = await provider.createPayment({
        merchantId: merchantId.toString(),
        orderId: order._id.toString(),
        amount: Number(amount),
        currency,
        paymentMethod,
        simulateStatus,
      });

      // Save payment in DB
      const payment = await Payment.create({
        merchantId,
        orderId: order._id,
        paymentReference: mockResult.paymentReference,
        amount: Number(amount),
        currency,
        paymentMethod,
        status: mockResult.status,
        failureReason: mockResult.failureReason,
        settledAt: mockResult.status === 'SUCCESS' ? new Date(Date.now() + 86400000) : undefined,
      });

      // Create matched or unmatched reconciliation record
      await ReconciliationRecord.create({
        merchantId,
        orderId: order._id,
        paymentId: payment._id,
        status: mockResult.status === 'SUCCESS' ? 'MATCHED' : 'UNMATCHED',
        mismatchType: mockResult.status === 'SUCCESS' ? 'NONE' : 'ORDER_PAYMENT_MISMATCH',
        expectedAmount: Number(amount),
        actualAmount: mockResult.status === 'SUCCESS' ? Number(amount) : 0,
        difference: mockResult.status === 'SUCCESS' ? 0 : Number(amount),
        evidence: {
          gatewayResponse: mockResult,
          isDemoPayment: true,
        },
      });

      res.status(201).json({
        success: true,
        message: `Demo transaction simulated: ${payment.status}`,
        data: {
          payment,
          order,
          gatewayResult: mockResult,
        },
      });
    } catch (err: any) {
      console.error('[Payments] Error creating mock payment:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
