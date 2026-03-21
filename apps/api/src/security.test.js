import test from 'node:test';
import assert from 'node:assert/strict';
import { decryptSecret, encryptSecret, hashPassword, signJwt, verifyJwt, verifyPassword } from './security.js';

test('password hash + verify works', async () => {
  const hash = await hashPassword('SuperSecret123');
  assert.equal(await verifyPassword('SuperSecret123', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
});

test('jwt sign/verify roundtrip works', () => {
  const token = signJwt({ sub: 'u1', email: 'u1@test.dev' }, 3600);
  const payload = verifyJwt(token);
  assert.equal(payload.sub, 'u1');
  assert.equal(payload.email, 'u1@test.dev');
});

test('secret encryption roundtrip works', () => {
  const encrypted = encryptSecret('AIza-test-key-value');
  assert.notEqual(encrypted, 'AIza-test-key-value');
  const decrypted = decryptSecret(encrypted);
  assert.equal(decrypted, 'AIza-test-key-value');
});
