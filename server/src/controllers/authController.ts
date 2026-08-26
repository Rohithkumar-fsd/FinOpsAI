import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Merchant } from '../models';
import { ENV } from '../config/env';
import { AuthRequest } from '../middleware/auth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: parseResult.error.errors[0].message,
        });
        return;
      }

      const { email, password } = parseResult.data;
      const merchant = await Merchant.findOne({ email: email.toLowerCase().trim() });

      if (!merchant) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, merchant.passwordHash);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      const token = jwt.sign(
        { merchantId: merchant._id.toString(), email: merchant.email },
        ENV.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        merchant: {
          id: merchant._id,
          name: merchant.name,
          email: merchant.email,
          currency: merchant.currency,
        },
      });
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      res.status(500).json({ success: false, message: 'Internal server error during authentication' });
    }
  }

  static async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        merchant: {
          id: req.merchant._id,
          name: req.merchant.name,
          email: req.merchant.email,
          currency: req.merchant.currency,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
