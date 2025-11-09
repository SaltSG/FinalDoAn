import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { connectMongo } from './config/db';
import { authRouter } from './routes/auth';
import { resultsRouter } from './routes/results';
import { curriculumRouter } from './routes/curriculum';
import { deadlinesRouter } from './routes/deadlines';
import { chatRouter } from './routes/chat';
import { initializeSocket } from './realtime/socket';

const app = express();

app.use(helmet({ crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' } }));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// MongoDB connect (modularized)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finaldoan';
connectMongo(MONGO_URI).catch((err: any) => {
  // eslint-disable-next-line no-console
  console.error('[mongo] error', err.message);
});

app.get('/api/health', async (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), mongo: mongoose.connection.readyState });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/results', resultsRouter);
app.use('/api/curriculum', curriculumRouter);
app.use('/api/deadlines', deadlinesRouter);
app.use('/api/chat', chatRouter);

const PORT = Number(process.env.PORT || 5000);
const server = http.createServer(app);
initializeSocket(server).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[socket] init error', err);
});
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${PORT}`);
});


