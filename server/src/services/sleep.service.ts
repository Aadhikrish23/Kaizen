import SleepLog, { ISleepLog } from '../models/SleepLog';

/**
 * Calculates duration in minutes from HH:MM bedtime to HH:MM wakeTime,
 * properly accounting for crossing midnight.
 */
export const calculateDurationFromTimes = (bedtime: string, wakeTime: string): number => {
  const parseMinutes = (timeStr: string): number => {
    const parts = timeStr.trim().split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  };

  const bedMin = parseMinutes(bedtime);
  const wakeMin = parseMinutes(wakeTime);

  if (wakeMin >= bedMin) {
    return wakeMin - bedMin;
  } else {
    // Overnight sleep (e.g. 23:00 to 07:00)
    return (24 * 60 - bedMin) + wakeMin;
  }
};

/**
 * Calculates recovery score (0 - 100) based on sleep duration and subjective quality (1-5).
 */
export const calculateRecoveryScore = (durationMinutes: number, quality: number): number => {
  // Duration score (max 60 points) - 7 to 9 hours is optimal (420 to 540 min)
  let durationScore = 0;
  if (durationMinutes >= 420 && durationMinutes <= 540) {
    durationScore = 60;
  } else if (durationMinutes < 420) {
    durationScore = Math.max(10, Math.round(60 * (durationMinutes / 420)));
  } else {
    // Oversleeping slight penalty
    durationScore = Math.max(35, 60 - Math.round((durationMinutes - 540) / 10));
  }

  // Quality score (max 40 points)
  const safeQuality = Math.min(Math.max(quality || 3, 1), 5);
  const qualityScore = Math.round((safeQuality / 5) * 40);

  return Math.min(100, Math.max(0, durationScore + qualityScore));
};

/**
 * Computes optimal bedtime recommendation windows given a target morning wake time
 * based on 90-minute sleep cycles + 15 min sleep latency.
 */
export const calculateOptimalSleepWindows = (targetWakeTime: string) => {
  const parts = targetWakeTime.trim().split(':');
  const wakeHours = parseInt(parts[0], 10) || 7;
  const wakeMinutes = parseInt(parts[1], 10) || 0;
  const wakeTotal = wakeHours * 60 + wakeMinutes;

  const latencyMinutes = 15;
  const cycles = [
    { cycles: 6, durationHours: '9h', label: 'Maximum Recovery', desc: '6 cycles - Best for intense athletic strain & neurogenesis' },
    { cycles: 5, durationHours: '7h 30m', label: 'Optimal Window', desc: '5 cycles - Gold standard for energy and circadian balance' },
    { cycles: 4, durationHours: '6h', label: 'Minimum Restorative', desc: '4 cycles - Baseline restorative sleep' },
    { cycles: 3, durationHours: '4h 30m', label: 'Power Rest', desc: '3 cycles - Emergency short night' }
  ];

  return cycles.map(c => {
    const totalSleepMin = c.cycles * 90 + latencyMinutes;
    let bedTotal = wakeTotal - totalSleepMin;
    while (bedTotal < 0) {
      bedTotal += 24 * 60;
    }
    const h = Math.floor(bedTotal / 60);
    const m = bedTotal % 60;
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return {
      ...c,
      bedtime: formatted
    };
  });
};

export interface UpsertSleepData {
  date: string;
  bedtime: string;
  wakeTime: string;
  durationMinutes?: number;
  quality?: number;
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  lightSleepMinutes?: number;
  awakeMinutes?: number;
  notes?: string;
  userId: string;
}

export const upsertSleepLog = async (data: UpsertSleepData): Promise<ISleepLog> => {
  const duration = data.durationMinutes !== undefined && data.durationMinutes > 0
    ? data.durationMinutes
    : calculateDurationFromTimes(data.bedtime, data.wakeTime);

  const cyclesCount = Number((duration / 90).toFixed(1));
  const quality = data.quality || 3;
  const recoveryScore = calculateRecoveryScore(duration, quality);

  // Auto-estimate stages if not provided
  const deepSleepMinutes = data.deepSleepMinutes !== undefined
    ? data.deepSleepMinutes
    : Math.round(duration * 0.20);

  const remSleepMinutes = data.remSleepMinutes !== undefined
    ? data.remSleepMinutes
    : Math.round(duration * 0.25);

  const awakeMinutes = data.awakeMinutes !== undefined
    ? data.awakeMinutes
    : Math.max(0, Math.round(duration * 0.05));

  const lightSleepMinutes = data.lightSleepMinutes !== undefined
    ? data.lightSleepMinutes
    : Math.max(0, duration - deepSleepMinutes - remSleepMinutes - awakeMinutes);

  const updateDoc = {
    bedtime: data.bedtime,
    wakeTime: data.wakeTime,
    durationMinutes: duration,
    quality,
    cyclesCount,
    deepSleepMinutes,
    remSleepMinutes,
    lightSleepMinutes,
    awakeMinutes,
    recoveryScore,
    notes: data.notes || ''
  };

  const log = await SleepLog.findOneAndUpdate(
    { userId: data.userId, date: data.date },
    updateDoc,
    { new: true, upsert: true, runValidators: true }
  );

  return log;
};

export const getSleepLogByDate = async (userId: string, date: string): Promise<ISleepLog | null> => {
  return await SleepLog.findOne({ userId, date });
};

export const getSleepLogs = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<ISleepLog[]> => {
  const query: Record<string, any> = { userId };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    query.date = { $gte: startDate };
  } else if (endDate) {
    query.date = { $lte: endDate };
  }

  return await SleepLog.find(query).sort({ date: -1 }).limit(30);
};

export const deleteSleepLog = async (userId: string, id: string): Promise<ISleepLog | null> => {
  return await SleepLog.findOneAndDelete({ _id: id, userId });
};
