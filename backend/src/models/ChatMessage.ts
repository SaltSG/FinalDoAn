import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  room: string;
  userId: string;
  userName?: string;
  content: string;
  attachment?: {
    url: string;
    name: string;
    size: number;
    mimeType?: string;
    width?: number;
    height?: number;
  };
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  room: { type: String, default: 'global', index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String },
  content: { type: String, required: true },
  attachment: {
    url: { type: String },
    name: { type: String },
    size: { type: Number },
    mimeType: { type: String },
    width: { type: Number },
    height: { type: Number },
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);


