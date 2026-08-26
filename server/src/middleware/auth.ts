import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { Merchant } from '../models';

export interface AuthRequest extends Request {
  merchant?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication required. Missing Bearer token.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, ENV.JWT_SECRET);

    if (!decoded || !decoded.merchantId) {
      res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
      return;
    }

    const merchant = await Merchant.findById(decoded.merchantId).select('-passwordHash');
    if (!merchant) {
      res.status(401).json({ success: false, message: 'Merchant account not found.' });
      return;
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Unauthorized. Token verification failed.' });
  }
};
