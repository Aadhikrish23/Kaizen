import mongoose, { Schema, Document } from 'mongoose';

export interface IXpEvent extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  date: string;
  dedupeKey: string;
  xp: number;
  refId?: string;
  createdAt: Date;
}

const XpEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    date: { type: String, required: true },
    dedupeKey: { type: String, required: true },
    xp: { type: Number, required: true, min: 0 },
    refId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One award per (user, dedupeKey): this is what makes XP idempotent and caps farming.
XpEventSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
XpEventSchema.index({ userId: 1, type: 1 });

export default mongoose.model<IXpEvent>('XpEvent', XpEventSchema);
