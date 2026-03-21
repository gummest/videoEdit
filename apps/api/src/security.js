import crypto from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || 'change-me-auth-secret';
const ENC_SECRET = process.env.ENCRYPTION_SECRET || AUTH_SECRET;

const deriveKey = (secret) => crypto.createHash('sha256').update(secret).digest();
const encKey = deriveKey(ENC_SECRET);

export const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
  return `${salt}:${derived.toString('hex')}`;
};

export const verifyPassword = async (password, storedHash) => {
  const [salt, existing] = (storedHash || '').split(':');
  if (!salt || !existing) return false;

  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });

  const existingBuf = Buffer.from(existing, 'hex');
  if (existingBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(existingBuf, derived);
};

const b64url = (value) => Buffer.from(value).toString('base64url');

export const signJwt = (payload, expiresInSec = 60 * 60 * 24 * 7) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSec };
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedBody = b64url(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedBody}`;
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
};

export const verifyJwt = (token) => {
  if (!token) return null;
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;

  const data = `${header}.${payload}`;
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
};

export const encryptSecret = (plain) => {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
};

export const decryptSecret = (ciphertext) => {
  if (!ciphertext) return null;
  const [ivB64, tagB64, encB64] = ciphertext.split('.');
  if (!ivB64 || !tagB64 || !encB64) return null;
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const enc = Buffer.from(encB64, 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
  return plain.toString('utf-8');
};
