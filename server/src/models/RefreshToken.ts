import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken extends Document {
  token: string;
  user: mongoose.Types.ObjectId;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByToken?: string;
  isExpired: boolean;
  isActive: boolean;
}

const RefreshTokenSchema = new Schema(
  {
    token: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    replacedByToken: String
  },
  { timestamps: true }
);

RefreshTokenSchema.virtual('isExpired').get(function (this: IRefreshToken) {
  return Date.now() >= this.expiresAt.getTime();
});

RefreshTokenSchema.virtual('isActive').get(function (this: IRefreshToken) {
  return !this.revokedAt && !this.isExpired;
});

export default mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
