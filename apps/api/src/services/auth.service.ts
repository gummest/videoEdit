import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib.prisma.js';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from './token.service.js';

function mapAuthInfrastructureError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw new Error('DATABASE_CONNECTION_ERROR');
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P1001') {
    throw new Error('DATABASE_CONNECTION_ERROR');
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new Error('AUTH_SERVICE_CONFIGURATION_ERROR');
  }

  throw error;
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
    mapAuthInfrastructureError(error);
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
    mapAuthInfrastructureError(error);
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
    mapAuthInfrastructureError(error);
  }
}

export async function logout(refreshToken: string) {
  try {
    await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(refreshToken) }, data: { revokedAt: new Date() } });
  } catch (error) {
    mapAuthInfrastructureError(error);
  }
}
