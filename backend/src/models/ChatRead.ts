import mongoose, { Schema, Document } from 'mongoose';

export interface IChatRead extends Document {
  room: string;
  userId: string;
  lastReadAt: Date;
}

const chatReadSchema = new Schema<IChatRead>({
  room: { type: String, default: 'global', index: true },
  userId: { type: String, required: true, index: true },
  lastReadAt: { type: Date, default: new Date(0) },
}, { timestamps: false });

chatReadSchema.index({ room: 1, userId: 1 }, { unique: true });

export const ChatRead = mongoose.model<IChatRead>('ChatRead', chatReadSchema);


