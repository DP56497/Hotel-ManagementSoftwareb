import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePassword, createToken, hashPassword, verifyToken } from '../utils/auth.js';

test('hashes and compares passwords correctly', async () => {
  const password = 'StrongPass123!';
  const hashed = await hashPassword(password);
  assert.notEqual(hashed, password);
  const isMatch = await comparePassword(password, hashed);
  assert.equal(isMatch, true);
});

test('creates and verifies tokens', () => {
  const payload = { id: 'user-1', role: 'owner' };
  const token = createToken(payload);
  const decoded = verifyToken(token);
  assert.equal(decoded.id, payload.id);
  assert.equal(decoded.role, payload.role);
});
