import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../lib.prisma.js';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from './token.service.js';

type LocalUser = {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  createdAt: string;
};

type LocalRefreshToken = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  revokedAt?: string;
};

type LocalAuthDb = {
  users: LocalUser[];
  refreshTokens: LocalRefreshToken[];
};

const localDbPath = path.resolve(process.cwd(), 'data', 'auth-local.json');

async function readLocalDb(): Promise<LocalAuthDb> {
  await fs.mkdir(path.dirname(localDbPath), { recursive: true });
  try {
    const raw = await fs.readFile(localDbPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LocalAuthDb>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      refreshTokens: Array.isArray(parsed.refreshTokens) ? parsed.refreshTokens : []
    };
  } catch {
    const empty: LocalAuthDb = { users: [], refreshTokens: [] };
    await fs.writeFile(localDbPath, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
}

async function writeLocalDb(nextDb: LocalAuthDb) {
  await fs.mkdir(path.dirname(localDbPath), { recursive: true });
  await fs.writeFile(localDbPath, JSON.stringify(nextDb, null, 2), 'utf-8');
}

function shouldUseLocalAuthFallback(error: unknown) {
  const message = (error as Error)?.message ?? '';
  return (
    message.includes('DATABASE_URL') ||
    message.includes('Can\'t reach database server') ||
    message.includes('P1001') ||
    message.includes('P1012') ||
    message.includes('PrismaClientInitializationError')
  );
}

async function registerLocal(email: string, password: string, name?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const db = await readLocalDb();

  if (db.users.some((user) => user.email === normalizedEmail)) {
    throw new Error('EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user: LocalUser = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash,
    name,
    createdAt: new Date().toISOString()
  };

  const payload = { sub: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  db.users.push(user);
  db.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    expiresAt: new Date(Date.now() + 604800000).toISOString()
  });
  await writeLocalDb(db);

  return { user, accessToken, refreshToken };
}

async function loginLocal(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const db = await readLocalDb();
  const user = db.users.find((item) => item.email === normalizedEmail);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const payload = { sub: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  db.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    expiresAt: new Date(Date.now() + 604800000).toISOString()
  });
  await writeLocalDb(db);

  return { user, accessToken, refreshToken };
}

async function refreshLocal(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const db = await readLocalDb();
  const tokenHash = hashToken(refreshToken);
  const savedToken = db.refreshTokens.find((token) => token.tokenHash === tokenHash);

  if (!savedToken || savedToken.revokedAt || new Date(savedToken.expiresAt) < new Date()) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  savedToken.revokedAt = new Date().toISOString();

  const accessToken = signAccessToken({ sub: payload.sub, email: payload.email });
  const nextRefreshToken = signRefreshToken({ sub: payload.sub, email: payload.email });

  db.refreshTokens.push({
    tokenHash: hashToken(nextRefreshToken),
    userId: payload.sub,
    expiresAt: new Date(Date.now() + 604800000).toISOString()
  });

  const user = db.users.find((item) => item.id === payload.sub);
  if (!user) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  await writeLocalDb(db);

  return { user, accessToken, refreshToken: nextRefreshToken };
}

async function logoutLocal(refreshToken: string) {
  const db = await readLocalDb();
  const tokenHash = hashToken(refreshToken);
  db.refreshTokens = db.refreshTokens.map((token) =>
    token.tokenHash === tokenHash ? { ...token, revokedAt: new Date().toISOString() } : token
  );
  await writeLocalDb(db);
}

export async function register(email: string, password: string, name?: string) {
  try {
    if (await prisma.user.findUnique({ where: { email } })) throw new Error('EMAIL_IN_USE');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash, name } });
    const payload = { sub: user.id, email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + 604800000) } });
    return { user, accessToken, refreshToken };
  } catch (error) {
    if (shouldUseLocalAuthFallback(error)) {
      return registerLocal(email, password, name);
    }
    throw error;
  }
}

export async function login(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new Error('INVALID_CREDENTIALS');
    const payload = { sub: user.id, email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + 604800000) } });
    return { user, accessToken, refreshToken };
  } catch (error) {
    if (shouldUseLocalAuthFallback(error)) {
      return loginLocal(email, password);
    }
    throw error;
  }
}

export async function refresh(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);
    const savedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!savedToken || savedToken.revokedAt || savedToken.expiresAt < new Date()) throw new Error('INVALID_REFRESH_TOKEN');
    const accessToken = signAccessToken({ sub: payload.sub, email: payload.email });
    const nextRefreshToken = signRefreshToken({ sub: payload.sub, email: payload.email });
    await prisma.refreshToken.update({ where: { tokenHash }, data: { revokedAt: new Date() } });
    await prisma.refreshToken.create({ data: { userId: payload.sub, tokenHash: hashToken(nextRefreshToken), expiresAt: new Date(Date.now() + 604800000) } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    return { user, accessToken, refreshToken: nextRefreshToken };
  } catch (error) {
    if (shouldUseLocalAuthFallback(error)) {
      return refreshLocal(refreshToken);
    }
    throw error;
  }
}

export async function logout(refreshToken: string) {
  try {
    await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(refreshToken) }, data: { revokedAt: new Date() } });
  } catch (error) {
    if (shouldUseLocalAuthFallback(error)) {
      await logoutLocal(refreshToken);
      return;
    }
    throw error;
  }
}
