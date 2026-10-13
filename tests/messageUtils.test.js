import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMessagesForUser, markMessagesAsReadForUser } from '../utils/messageUtils.js';

test('filters messages for the signed-in employee and keeps owner conversations visible', () => {
  const messages = [
    { _id: '1', senderId: 'owner-1', senderName: 'Asha Patel', senderRole: 'owner', recipientId: 'staff-9', recipientName: 'Nisha', recipientRole: 'staff', content: 'Shift update', createdAt: '2026-08-13T09:00:00.000Z' },
    { _id: '2', senderId: 'manager-4', senderName: 'Ravi', senderRole: 'manager', recipientId: 'staff-9', recipientName: 'Nisha', recipientRole: 'staff', content: 'Team note', createdAt: '2026-08-13T08:00:00.000Z' },
    { _id: '3', senderId: 'staff-9', senderName: 'Nisha', senderRole: 'staff', recipientId: 'owner-1', recipientName: 'Asha Patel', recipientRole: 'owner', content: 'Acknowledged', createdAt: '2026-08-13T07:00:00.000Z' },
    { _id: '4', senderId: 'staff-8', senderName: 'Riya', senderRole: 'staff', recipientId: 'manager-4', recipientName: 'Ravi', recipientRole: 'manager', content: 'Different team', createdAt: '2026-08-13T06:00:00.000Z' }
  ];

  const visible = filterMessagesForUser(messages, 'staff-9');

  assert.deepEqual(visible.map((message) => message._id), ['1', '2', '3']);
});

test('marks incoming replies as read when the owner checks the inbox', () => {
  const messages = [
    { _id: 'reply-1', senderId: 'staff-9', senderName: 'Nisha', senderRole: 'staff', recipientId: 'owner-1', recipientName: 'Asha Patel', recipientRole: 'owner', content: 'On it', read: false },
    { _id: 'reply-2', senderId: 'owner-1', senderName: 'Asha Patel', senderRole: 'owner', recipientId: 'staff-9', recipientName: 'Nisha', recipientRole: 'staff', content: 'Great', read: true }
  ];

  const updated = markMessagesAsReadForUser(messages, 'owner-1');

  assert.deepEqual(updated.map((message) => message._id), ['reply-1', 'reply-2']);
  assert.equal(updated[0].read, true);
  assert.equal(updated[1].read, true);
});
