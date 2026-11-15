import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../features/auth/User';
import WaterLog from '../features/water/WaterLog';
import MealLog from '../features/meals/MealLog';
import WeightLog from '../features/weight/WeightLog';
import WorkoutLog from '../features/workouts/WorkoutLog';

dotenv.config();

const migrate = async () => {
  try {
    // Orphaned records are assigned to an EXISTING account named on the command line.
    // This script never creates users (it used to create a default admin with a known password; that was removed).
    const email = (process.argv[2] || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      console.error('Usage: node dist/scripts/migrateData.js <owner-email>  (the account must already exist)');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/kaizen_db');
    console.log('Connected to DB');

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`No user with email ${email}. Register the account first.`);
      process.exit(2);
    }

    const userId = user._id;

    const updates = [
      WaterLog.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
      MealLog.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
      WeightLog.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
      WorkoutLog.updateMany({ userId: { $exists: false } }, { $set: { userId } })
    ];

    const results = await Promise.all(updates);
    console.log('Migration complete. Records updated:', results.map(r => r.modifiedCount));
    process.exit(0);
  } catch (error) {
    console.error('Migration failed', error);
    process.exit(1);
  }
};

migrate();
