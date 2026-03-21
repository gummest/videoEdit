import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import userAuthRoutes from './userAuthRoutes.js';

const startApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/account', userAuthRoutes);
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
};

test('register then me returns authenticated user', async () => {
  const { server, baseUrl } = await startApp();
  try {
    const registerRes = await fetch(`${baseUrl}/api/account/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tester', email: `tester-${Date.now()}@example.com`, password: 'Password123' }),
    });

    assert.equal(registerRes.status, 201);
    const cookie = registerRes.headers.get('set-cookie');
    assert.ok(cookie?.includes('ve_auth='));

    const meRes = await fetch(`${baseUrl}/api/account/me`, {
      headers: { Cookie: cookie },
    });

    assert.equal(meRes.status, 200);
    const body = await meRes.json();
    assert.ok(body.user.email.includes('@example.com'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
