import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
  clientUrl: process.env.CLIENT_URL ?? (isProduction ? 'https://edit.mesutapps.online' : 'http://localhost:5173')
};
