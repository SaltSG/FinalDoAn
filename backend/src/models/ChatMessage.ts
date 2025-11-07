import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  room: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  room: { type: String, default: 'global', index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String },
  content: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);


