import mongoose, { Schema, Document } from 'mongoose';

export interface IEquipmentItem {
  id: string;
  type: 'dumbbell' | 'barbell' | 'plates' | 'bench' | 'pullup_bar' | 'bands' | 'cable' | 'machine' | 'kettlebell' | 'other';
  name: string;
  availableWeightsKg: number[];
  platePairsKg?: number[];
  barbellWeightKg?: number;
  notes?: string;
}

export interface IWorkingWeightHistory {
  date: string;
  weightKg: number;
  reps: number;
  rpe?: number;
}

export interface IExerciseWorkingWeight {
  exerciseName: string;
  exerciseId?: string;
  currentWeightKg: number;
  targetReps: number;
  lastUsedDate: string;
  history: IWorkingWeightHistory[];
}

export interface IUserInventory extends Document {
  userId: mongoose.Types.ObjectId;
  equipment: IEquipmentItem[];
  workingWeights: IExerciseWorkingWeight[];
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentItemSchema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['dumbbell', 'barbell', 'plates', 'bench', 'pullup_bar', 'bands', 'cable', 'machine', 'kettlebell', 'other']
  },
  name: { type: String, required: true },
  availableWeightsKg: [{ type: Number }],
  platePairsKg: [{ type: Number }],
  barbellWeightKg: { type: Number, default: 20 },
  notes: { type: String }
}, { _id: false });

const WorkingWeightHistorySchema = new Schema({
  date: { type: String, required: true },
  weightKg: { type: Number, required: true },
  reps: { type: Number, required: true },
  rpe: { type: Number }
}, { _id: false });

const ExerciseWorkingWeightSchema = new Schema({
  exerciseName: { type: String, required: true },
  exerciseId: { type: String },
  currentWeightKg: { type: Number, required: true },
  targetReps: { type: Number, default: 10 },
  lastUsedDate: { type: String, required: true },
  history: [WorkingWeightHistorySchema]
}, { _id: false });

const UserInventorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  equipment: [EquipmentItemSchema],
  workingWeights: [ExerciseWorkingWeightSchema]
}, {
  timestamps: true
});

export default mongoose.model<IUserInventory>('UserInventory', UserInventorySchema);
