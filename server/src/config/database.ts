import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(customUri?: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  const uri = customUri || env.MONGODB_URI;
  try {
    const conn = await mongoose.connect(uri);
    if (env.NODE_ENV !== 'test') {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    }
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
}
