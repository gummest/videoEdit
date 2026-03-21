import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import session from 'express-session';

import authRoutes from './authRoutes.js';

const startApp = () => {
  const app = express();
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  }));
  app.use('/api/auth', authRoutes);

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
};

test('twitch auth route is mounted under /api/auth', async () => {
  const { server, baseUrl } = await startApp();

  try {
    const mountedRes = await fetch(`${baseUrl}/api/auth/twitch/me`);
    assert.equal(mountedRes.status, 401);
    const mountedBody = await mountedRes.json();
    assert.equal(mountedBody.error, 'Not authenticated');

    const unmountedRes = await fetch(`${baseUrl}/auth/twitch/me`);
    assert.equal(unmountedRes.status, 404);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
