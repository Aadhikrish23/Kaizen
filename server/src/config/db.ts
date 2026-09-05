import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const connURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kaizen_db';
    const conn = await mongoose.connect(connURI);
    console.log(`[Kaizen DB] Connected to MongoDB: ${conn.connection.name}`);
  } catch (error) {
    console.error(`[Kaizen DB] Connection Error: ${(error as Error).message}`);
    // In dev, we don't crash the server so routes can still be inspected if Mongo isn't running locally yet
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
