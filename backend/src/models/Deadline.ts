import { Schema, model, Types, Document } from 'mongoose';

export type DeadlineStatus = 'upcoming' | 'ongoing' | 'overdue' | 'completed';

export interface IDeadline extends Document {
  user: Types.ObjectId;
  title: string;
  startAt?: Date | null;
  endAt?: Date | null;
  note?: string;
  status: DeadlineStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DeadlineSchema = new Schema<IDeadline>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  startAt: { type: Date },
  endAt: { type: Date, index: true },
  note: { type: String, default: '' },
  status: { type: String, enum: ['upcoming', 'ongoing', 'overdue', 'completed'], default: 'upcoming', index: true },
}, { timestamps: true });

export const Deadline = model<IDeadline>('Deadline', DeadlineSchema);


