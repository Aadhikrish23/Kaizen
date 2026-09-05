import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';
import WaterLog from './models/WaterLog';
import MealLog from './models/MealLog';
import WeightLog from './models/WeightLog';
import WorkoutLog from './models/WorkoutLog';

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/kaizen_db');
    console.log('Connected to DB');

    let user = await User.findOne({ email: 'admin@kaizen.com' });
    if (!user) {
      console.log('Creating default admin user...');
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('admin123', 10);
      user = await User.create({
        name: 'Kaizen Admin',
        email: 'admin@kaizen.com',
        passwordHash: hash,
        role: 'admin'
      });
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
