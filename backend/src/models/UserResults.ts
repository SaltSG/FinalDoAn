import mongoose, { Schema, Document, Model, Types } from 'mongoose';

type CourseOverride = {
  grade?: number;
  status?: 'passed' | 'failed' | 'in-progress';
  name?: string;
  credit?: number;
};

export interface IUserResults extends Document {
  user: Types.ObjectId;
  data: Record<string, Record<string, CourseOverride>>;
  semGpa4?: Record<string, number>;
  cumGpa4?: Record<string, number>;
  specialization?: 'dev' | 'design';
}

const UserResultsSchema = new Schema<IUserResults>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true, unique: true },
  data: { type: Schema.Types.Mixed, default: {} },
  semGpa4: { type: Schema.Types.Mixed, default: {} },
  cumGpa4: { type: Schema.Types.Mixed, default: {} },
  specialization: { type: String, enum: ['dev', 'design'], default: undefined },
}, { timestamps: true });

export const UserResults: Model<IUserResults> = mongoose.models.UserResults || mongoose.model<IUserResults>('UserResults', UserResultsSchema);


