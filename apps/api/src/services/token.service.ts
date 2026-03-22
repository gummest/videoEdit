import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { TokenPayload } from '../types/auth.js';
import { env } from '../config/env.js';

export const signAccessToken = (payload: TokenPayload) => jwt.sign(payload, env.accessSecret, { expiresIn: '15m' });
export const signRefreshToken = (payload: TokenPayload) => jwt.sign(payload, env.refreshSecret, { expiresIn: '7d' });
export const verifyRefreshToken = (token: string) => jwt.verify(token, env.refreshSecret) as TokenPayload;
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
