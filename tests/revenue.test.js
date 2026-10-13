import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, getRevenueSummary } from '../../frontend/src/utils/revenue.js';

test('totals today revenue from orders created today', () => {
  const referenceDate = new Date('2026-08-09T12:00:00.000Z');
  const orders = [
    { total: 250, paymentStatus: 'paid', createdAt: '2026-08-09T10:30:00.000Z' },
    { total: 400, paymentStatus: 'paid', createdAt: '2026-08-08T20:00:00.000Z' },
    { total: 1200, paymentStatus: 'pending', createdAt: '2026-08-09T15:00:00.000Z' }
  ];

  const summary = getRevenueSummary(orders, 'today', referenceDate);

  assert.equal(summary.total, 250);
  assert.equal(summary.count, 1);
  assert.equal(formatCurrency(250), '₹250');
});

test('totals monthly revenue for the selected month', () => {
  const referenceDate = new Date('2026-08-09T12:00:00.000Z');
  const orders = [
    { total: 300, paymentStatus: 'paid', createdAt: '2026-08-01T10:30:00.000Z' },
    { total: 600, paymentStatus: 'paid', createdAt: '2026-07-31T20:00:00.000Z' },
    { total: 900, paymentStatus: 'pending', createdAt: '2026-08-10T15:00:00.000Z' }
  ];

  const summary = getRevenueSummary(orders, 'month', referenceDate);

  assert.equal(summary.total, 300);
  assert.equal(summary.count, 1);
});
