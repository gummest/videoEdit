import { readDb } from './db.js';
import { verifyJwt } from './security.js';

export const requireAppAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearer || req.cookies?.ve_auth;

  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = await readDb();
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.appUser = user;
  next();
};
