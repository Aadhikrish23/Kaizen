import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
