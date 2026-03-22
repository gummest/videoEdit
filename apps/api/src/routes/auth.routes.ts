import { Router } from 'express';
import { login, logout, refresh, register } from '../services/auth.service.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const result = await register(req.body.email, req.body.password, req.body.name);
    res.cookie('refreshToken', result.refreshToken, { httpOnly: true, sameSite: 'lax', secure: false });
    res.status(201).json({ user: { id: result.user.id, email: result.user.email, name: result.user.name }, accessToken: result.accessToken });
  } catch (error) { res.status(400).json({ message: (error as Error).message }); }
});

authRouter.post('/login', async (req, res) => {
  try {
    const result = await login(req.body.email, req.body.password);
    res.cookie('refreshToken', result.refreshToken, { httpOnly: true, sameSite: 'lax', secure: false });
    res.json({ user: { id: result.user.id, email: result.user.email, name: result.user.name }, accessToken: result.accessToken });
  } catch (error) { res.status(401).json({ message: (error as Error).message }); }
});

authRouter.post('/refresh', async (req, res) => {
  try {
    if (!req.cookies.refreshToken) return res.status(401).json({ message: 'REFRESH_TOKEN_MISSING' });
    const result = await refresh(req.cookies.refreshToken as string);
    res.cookie('refreshToken', result.refreshToken, { httpOnly: true, sameSite: 'lax', secure: false });
    return res.json({ user: { id: result.user.id, email: result.user.email, name: result.user.name }, accessToken: result.accessToken });
  } catch (error) { return res.status(401).json({ message: (error as Error).message }); }
});

authRouter.post('/logout', async (req, res) => {
  if (req.cookies.refreshToken) await logout(req.cookies.refreshToken as string);
  res.clearCookie('refreshToken');
  res.status(204).send();
});
