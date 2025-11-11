import mongoose from 'mongoose';

export async function connectMongo(uri: string) {
  await mongoose.connect(uri);
  // eslint-disable-next-line no-console
  console.log('[mongo] connected');
  return mongoose.connection;
}
