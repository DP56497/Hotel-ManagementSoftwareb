import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  comparePassword,
  isStrongPassword
} from '../utils/auth.js';

test('isStrongPassword strictly verifies password complexity requirements', () => {
  // Too short
  assert.equal(isStrongPassword('Abc1!'), false);
  // Missing uppercase
  assert.equal(isStrongPassword('password123!'), false);
  // Missing lowercase
  assert.equal(isStrongPassword('PASSWORD123!'), false);
  // Missing number
  assert.equal(isStrongPassword('Password!@#$'), false);
  // Missing symbol
  assert.equal(isStrongPassword('Password1234'), false);

  // Valid strong passwords
  assert.equal(isStrongPassword('RoyalPlaza2026!'), true);
  assert.equal(isStrongPassword('SecureP@ssw0rd!'), true);
});

test('createOpaqueToken creates unique tokens and hashOpaqueToken is deterministic', () => {
  const token1 = createOpaqueToken();
  const token2 = createOpaqueToken();
  assert.notEqual(token1, token2);
  assert.equal(token1.length, 64); // 32 bytes in hex

  const hash1a = hashOpaqueToken(token1);
  const hash1b = hashOpaqueToken(token1);
  assert.equal(hash1a, hash1b);
  assert.notEqual(hash1a, hashOpaqueToken(token2));
});

test('Password reset cycle verifies old vs new password hashes', async () => {
  const oldPassword = 'OldPassword123!';
  const newPassword = 'NewSecret2026@!';

  const initialHash = await hashPassword(oldPassword);
  assert.equal(await comparePassword(oldPassword, initialHash), true);
  assert.equal(await comparePassword(newPassword, initialHash), false);

  // Simulating reset password step
  const updatedHash = await hashPassword(newPassword);
  assert.equal(await comparePassword(newPassword, updatedHash), true);
  assert.equal(await comparePassword(oldPassword, updatedHash), false);
});
