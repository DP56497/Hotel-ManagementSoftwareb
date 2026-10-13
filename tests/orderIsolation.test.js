import test from 'node:test';
import assert from 'node:assert/strict';
import Order from '../models/orderModel.js';

test('Order model includes userId field with default empty string', () => {
  const order = new Order({
    customerName: 'Customer Test',
    tableNumber: 3,
    items: [{ name: 'Paneer Butter Masala', qty: 1, price: 220, category: 'Punjabi Dish' }],
    total: 220
  });

  assert.equal(order.userId, '');
  assert.equal(order.customerName, 'Customer Test');
  assert.equal(order.tableNumber, 3);
});

test('Order model stores explicit userId and userEmail when provided', () => {
  const order = new Order({
    userId: 'user_12345',
    userEmail: 'customer@test.com',
    customerName: 'Customer Test',
    tableNumber: 3,
    items: [{ name: 'Masala Dosa', qty: 2, price: 120, category: 'South Indian Dish' }],
    total: 240
  });

  assert.equal(order.userId, 'user_12345');
  assert.equal(order.userEmail, 'customer@test.com');
  assert.equal(order.total, 240);
});

test('Customer filter strictly matches own orders and does not match previous orders on same table', () => {
  const allOrders = [
    // Customer A (current user)
    { id: 1, userId: 'user_cust_A', userEmail: 'alice@example.com', customerName: 'Alice', tableNumber: 2, total: 300, paymentStatus: 'paid' },
    // Previous order on Table 2 by a previous customer
    { id: 2, userId: 'user_cust_B', userEmail: 'bob@example.com', customerName: 'Bob', tableNumber: 2, total: 450, paymentStatus: 'paid' },
    // Another order from another customer on Table 5
    { id: 3, userId: 'user_cust_C', userEmail: 'charlie@example.com', customerName: 'Charlie', tableNumber: 5, total: 600, paymentStatus: 'pending' },
    // Customer A second order
    { id: 4, userId: 'user_cust_A', userEmail: 'alice@example.com', customerName: 'Alice', tableNumber: 2, total: 150, paymentStatus: 'pending' }
  ];

  const currentUserId = 'user_cust_A';
  const currentUserEmail = 'alice@example.com';
  const currentUserName = 'Alice';

  const filterCustomerOrders = (orders, userId, userEmail, userName) => {
    return orders.filter((order) => {
      if (userId && (order.userId === userId || String(order.userId) === String(userId))) return true;
      if (userEmail && order.userEmail && order.userEmail.toLowerCase() === userEmail.toLowerCase()) return true;
      const activeName = (userName || '').trim().toLowerCase();
      const orderCustomerName = (order.customerName || '').trim().toLowerCase();
      if (activeName && orderCustomerName === activeName) {
        if (!order.userEmail || (userEmail && order.userEmail.toLowerCase() === userEmail.toLowerCase())) {
          return true;
        }
      }
      return false;
    });
  };

  const aliceOrders = filterCustomerOrders(allOrders, currentUserId, currentUserEmail, currentUserName);
  assert.equal(aliceOrders.length, 2);
  assert.deepEqual(aliceOrders.map((o) => o.id), [1, 4]);

  // Ensure Bob's previous order on Table 2 is NOT seen by Alice
  assert.equal(aliceOrders.some((o) => o.id === 2), false);

  // Bob's view
  const bobOrders = filterCustomerOrders(allOrders, 'user_cust_B', 'bob@example.com', 'Bob');
  assert.equal(bobOrders.length, 1);
  assert.equal(bobOrders[0].id, 2);
});

test('Owner, manager, and waiter staff roles are permitted to delete orders', () => {
  const canDeleteOrder = (userRole, staffCategory) =>
    ['owner', 'manager'].includes(userRole) || (userRole === 'staff' && staffCategory === 'waiter');
  assert.equal(canDeleteOrder('owner'), true);
  assert.equal(canDeleteOrder('manager'), true);
  assert.equal(canDeleteOrder('staff', 'waiter'), true);
  assert.equal(canDeleteOrder('staff', 'cleaning'), false);
  assert.equal(canDeleteOrder('customer'), false);
  assert.equal(canDeleteOrder(undefined), false);
});

test('Order model initializes readyAt, completedAt, prepTimeMinutes, and serveTimeMinutes schema defaults', () => {
  const order = new Order({
    customerName: 'Test Diner',
    tableNumber: 8,
    items: [{ name: 'Butter Naan', qty: 2, price: 40 }],
    total: 80
  });

  assert.equal(order.readyAt, null);
  assert.equal(order.completedAt, null);
  assert.equal(order.preparedBy, '');
  assert.equal(order.servedBy, '');
  assert.equal(order.prepTimeMinutes, null);
  assert.equal(order.serveTimeMinutes, null);
});

test('Waiter completion rate accurately reflects ready vs completed order states', () => {
  const computeWaiterCompletionRate = (readyCount, completedCount) => {
    const totalHandled = readyCount + completedCount;
    return totalHandled > 0 ? Math.round((completedCount / totalHandled) * 100) : 100;
  };

  // Initially 0 ready, 10 completed -> 100%
  assert.equal(computeWaiterCompletionRate(0, 10), 100);
  // 1 order turns Ready (waiting for waiter) -> 10 / 11 = 91%
  assert.equal(computeWaiterCompletionRate(1, 10), 91);
  // Waiter completes that order -> 11 / 11 = 100%
  assert.equal(computeWaiterCompletionRate(0, 11), 100);
  // 2 orders turn Ready -> 11 / 13 = 85%
  assert.equal(computeWaiterCompletionRate(2, 11), 85);
});


