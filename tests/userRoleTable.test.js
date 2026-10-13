import test from 'node:test';
import assert from 'node:assert/strict';
import User from '../models/userModel.js';

test('User model does not assign default tableNumber for non-customer roles', () => {
  const owner = new User({
    name: 'Owner Test',
    email: 'owner-test@royalplaza.com',
    password: 'Password123!',
    role: 'owner'
  });
  assert.equal(owner.tableNumber, undefined);

  const manager = new User({
    name: 'Manager Test',
    email: 'manager-test@royalplaza.com',
    password: 'Password123!',
    role: 'manager'
  });
  assert.equal(manager.tableNumber, undefined);

  const staff = new User({
    name: 'Staff Test',
    email: 'staff-test@royalplaza.com',
    password: 'Password123!',
    role: 'staff',
    staffCategory: 'waiter'
  });
  assert.equal(staff.tableNumber, undefined);
});

test('User model removes tableNumber if provided for non-customer roles via pre-save hook', () => {
  const staffWithTable = new User({
    name: 'Staff Test 2',
    email: 'staff2@royalplaza.com',
    password: 'Password123!',
    role: 'staff',
    staffCategory: 'chef',
    tableNumber: 5
  });

  // Call the pre-save hook
  const preHooks = User.schema.s?.hooks?._pres?.get('save') || [];
  for (const hook of preHooks) {
    hook.fn.call(staffWithTable, () => {});
  }

  assert.equal(staffWithTable.tableNumber, undefined);
});

test('Customer role correctly retains tableNumber', () => {
  const customer = new User({
    name: 'Customer Test',
    email: 'customer-test@royalplaza.com',
    password: 'Password123!',
    role: 'customer',
    tableNumber: 12
  });
  assert.equal(customer.tableNumber, 12);
});
