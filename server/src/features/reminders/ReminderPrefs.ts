import mongoose, { Schema, Document } from 'mongoose';
import { REMINDER_TYPES } from './reminders.logic';

export interface IReminderPrefs extends Document {
  userId: mongoose.Types.ObjectId;
  reminders: Array<{ type: string; enabled: boolean; times: string[]; days: number[] }>;
  quietHours: { enabled: boolean; start: string; end: string };
}

const ReminderPrefsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    reminders: [
      {
        _id: false,
        type: { type: String, enum: REMINDER_TYPES, required: true },
        enabled: { type: Boolean, default: false },
        times: [{ type: String }],
        days: [{ type: Number, min: 0, max: 6 }],
      },
    ],
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '22:30' },
      end: { type: String, default: '07:00' },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IReminderPrefs>('ReminderPrefs', ReminderPrefsSchema);
