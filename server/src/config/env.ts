import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finops_ai',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_finops_ai_jwt_key_2026_jwt_token_auth',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || 'gemini-1.5-flash',
  AI_BASE_URL: process.env.AI_BASE_URL || '',
  AI_PROVIDER: process.env.AI_PROVIDER || (process.env.AI_API_KEY ? 'gemini' : 'demo'),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'whsec_finops_ai_mock_secret_2026_key',
};
