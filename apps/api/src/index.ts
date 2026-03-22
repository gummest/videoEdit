import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';

const app = express();
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.get('/health', (_req, res) => res.json({ ok: true, service: 'clipforge-api' }));
app.use('/api/auth', authRouter);
app.listen(env.port, () => console.log(`API listening on :${env.port}`));
