import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ENV } from './env';

let mongoMemoryServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);

    // Attempt connection to configured URI first
    console.log(`[DB] Attempting connection to MongoDB at: ${ENV.MONGODB_URI}`);
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[DB] Successfully connected to MongoDB at ${ENV.MONGODB_URI}`);
  } catch (error) {
    console.warn(`[DB] Direct MongoDB connection failed. Initializing in-memory MongoDB fallback server...`);
    try {
      mongoMemoryServer = await MongoMemoryServer.create({
        binary: { checkMD5: false },
        instance: {
          dbName: 'finops_ai',
        },
      });
      const memoryUri = mongoMemoryServer.getUri();
      console.log(`[DB] MongoMemoryServer created at ${memoryUri}`);
      await mongoose.connect(memoryUri);
      console.log(`[DB] Connected to In-Memory MongoDB successfully for zero-config operation.`);
    } catch (memError) {
      console.error('[DB] Fatal: Could not connect to MongoDB or In-Memory fallback:', memError);
      throw memError;
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
    console.log('[DB] Disconnected from MongoDB');
  } catch (err) {
    console.error('[DB] Error during disconnect:', err);
  }
};
