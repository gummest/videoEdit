import express from 'express';
import { randomUUID } from 'crypto';
import { readDb, updateDb } from './db.js';
import { hashPassword, signJwt, verifyJwt, verifyPassword } from './security.js';

const router = express.Router();

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt,
});

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email and password (min 8 chars) are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const db = await readDb();
  if (db.users.some((u) => u.email === normalizedEmail)) {
    return res.status(409).json({ error: 'Email is already registered.' });
  }

  const passwordHash = await hashPassword(password);
  const user = {
    id: randomUUID(),
    email: normalizedEmail,
    name: name?.trim() || normalizedEmail.split('@')[0],
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  await updateDb((draft) => {
    draft.users.push(user);
    return draft;
  });

  const token = signJwt({ sub: user.id, email: user.email });
  res.cookie('ve_auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(201).json({ user: sanitizeUser(user), token });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const db = await readDb();
  const user = db.users.find((u) => u.email === normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const ok = await verifyPassword(password || '', user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = signJwt({ sub: user.id, email: user.email });
  res.cookie('ve_auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ user: sanitizeUser(user), token });
});

router.post('/logout', (req, res) => {
  res.clearCookie('ve_auth');
  res.json({ success: true });
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearer || req.cookies?.ve_auth;
  const payload = verifyJwt(token);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const db = await readDb();
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  return res.json({ user: sanitizeUser(user) });
});

export default router;
