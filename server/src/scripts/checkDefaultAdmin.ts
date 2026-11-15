/**
 * Read-only check: is there an active admin with the legacy default e-mail (admin@kaizen.com)?
 *   npm run check-default-admin            (dev)
 *   node dist/scripts/checkDefaultAdmin.js (production image)
 * Exit code 0 = none found, 3 = found (act on it, see docs/admin.md). Writes nothing and prints no secrets.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../features/auth/User';
import { defaultAdminWarning, LEGACY_DEFAULT_ADMIN_EMAIL } from '../features/admin/admin.logic';

dotenv.config();

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/kaizen_db');
  const users = await User.find({ email: LEGACY_DEFAULT_ADMIN_EMAIL }).select('email role isActive').lean();
  const warning = defaultAdminWarning(users as any);
  await mongoose.disconnect();
  if (warning) {
    console.error(warning);
    process.exit(3);
  }
  console.log('OK: no active admin with the legacy default e-mail.');
};

main().catch((err) => {
  console.error('check-default-admin failed:', err.message);
  process.exit(1);
});
