import bcrypt from 'bcryptjs';
import { prisma } from '../lib.prisma.js';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from './token.service.js';

export async function register(email: string, password: string, name?: string) {
  if (await prisma.user.findUnique({ where: { email } })) throw new Error('EMAIL_IN_USE');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });
  const payload = { sub: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + 604800000) } });
  return { user, accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new Error('INVALID_CREDENTIALS');
  const payload = { sub: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + 604800000) } });
  return { user, accessToken, refreshToken };
}

export async function refresh(refreshToken: string) {
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
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(refreshToken) }, data: { revokedAt: new Date() } });
}
