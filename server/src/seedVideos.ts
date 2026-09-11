import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Exercise from './models/Exercise';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kaizen_db';

async function updateVideos() {
  await mongoose.connect(MONGO_URI);
  console.log('[VideoUpdater] Connected to MongoDB.');

  const videoData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'exerciseVideoData.json'), 'utf8')
  );

  let updated = 0;
  for (const [name, meta] of Object.entries(videoData)) {
    const res = await Exercise.updateMany(
      { name: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
      { $set: { videoUrl: (meta as any).videoUrl, formTips: (meta as any).formTips } }
    );
    if (res.matchedCount > 0) {
      updated += res.matchedCount;
    }
  }

  console.log(`[VideoUpdater] Updated ${updated} exercise records with live video URLs and form tips!`);
  process.exit(0);
}

updateVideos().catch(err => {
  console.error(err);
  process.exit(1);
});
