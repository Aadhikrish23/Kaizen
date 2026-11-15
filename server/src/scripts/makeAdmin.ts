/**
 * Promote an existing user to admin. This is the ONLY way to create an admin: no API endpoint can set the role.
 *   npm run make-admin -- someone@example.com
 * Reads MONGODB_URI (or MONGO_URI) from the environment / server/.env like the server does.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../features/auth/User';

dotenv.config();

const main = async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('Usage: npm run make-admin -- <email>');
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/kaizen_db';
  await mongoose.connect(uri);
  const user = await User.findOneAndUpdate({ email }, { $set: { role: 'admin', isActive: true } }, { new: true });
  if (!user) {
    console.error(`No user with email ${email}. Register the account first, then run this again.`);
    await mongoose.disconnect();
    process.exit(2);
  }
  console.log(`${user.email} is now an admin.`);
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('make-admin failed:', err.message);
  process.exit(1);
});
