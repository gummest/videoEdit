import crypto from 'node:crypto';
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

authRouter.get('/twitch/login', (req, res) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(503).json({ message: 'TWITCH_OAUTH_NOT_CONFIGURED' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('twitchOAuthState', state, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'user:read:email',
    state
  });

  return res.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
});

authRouter.get('/twitch', (_req, res) => res.redirect('/api/auth/twitch/login'));

authRouter.get('/twitch/callback', (req, res) => {
  const state = req.query.state as string | undefined;
  const cookieState = req.cookies.twitchOAuthState as string | undefined;
  if (!state || !cookieState || state !== cookieState) {
    return res.status(400).json({ message: 'TWITCH_OAUTH_STATE_INVALID' });
  }

  res.clearCookie('twitchOAuthState');
  return res.status(501).json({ message: 'TWITCH_OAUTH_CALLBACK_NOT_IMPLEMENTED' });
});
