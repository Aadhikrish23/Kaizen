import mongoose from 'mongoose';
import User from '../features/auth/User';
import { defaultAdminWarning, LEGACY_DEFAULT_ADMIN_EMAIL } from '../features/admin/admin.logic';

/** Log-only: tell operators if the legacy default admin account (old migration script) exists. Never blocks startup. */
const warnIfDefaultAdmin = async () => {
  try {
    const users = await User.find({ email: LEGACY_DEFAULT_ADMIN_EMAIL }).select('email role isActive').lean();
    const warning = defaultAdminWarning(users as any);
    if (warning) console.error(`[Kaizen SECURITY] ${warning}`);
  } catch {
    /* best effort */
  }
};

export const connectDB = async (): Promise<void> => {
  try {
    const connURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/kaizen_db';
    const conn = await mongoose.connect(connURI);
    console.log(`[Kaizen DB] Connected to MongoDB: ${conn.connection.name}`);
    await warnIfDefaultAdmin();
  } catch (error) {
    console.error(`[Kaizen DB] Connection Error: ${(error as Error).message}`);
    // In dev, we don't crash the server so routes can still be inspected if Mongo isn't running locally yet
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
