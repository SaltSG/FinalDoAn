import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash?: string;
  provider: 'local' | 'google';
  picture?: string;
  role: 'user' | 'admin';
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  passwordHash: { type: String },
  provider: { type: String, enum: ['local', 'google'], required: true },
  picture: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
}, { timestamps: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
