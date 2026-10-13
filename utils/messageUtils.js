export function filterMessagesForUser(messages = [], userId, userRole, staffCategory) {
  if (!Array.isArray(messages)) {
    return [];
  }

  if (!userId) {
    return messages;
  }

  if (userRole === 'owner') {
    return messages;
  }

  const isWaiter = userRole === 'staff' && staffCategory === 'waiter';

  return messages.filter((message) => {
    const senderId = message?.senderId != null ? String(message.senderId) : '';
    const recipientId = message?.recipientId != null ? String(message.recipientId) : '';
    const isDirect = senderId === String(userId) || recipientId === String(userId);
    const isWaiterBroadcast = isWaiter && (recipientId === 'waiters' || recipientId === 'all_waiters');
    return isDirect || isWaiterBroadcast;
  });
}

export function markMessagesAsReadForUser(messages = [], userId) {
  if (!Array.isArray(messages)) {
    return [];
  }

  if (!userId) {
    return messages;
  }

  return messages.map((message) => {
    const senderId = message?.senderId != null ? String(message.senderId) : '';
    const recipientId = message?.recipientId != null ? String(message.recipientId) : '';
    if (recipientId === String(userId)) {
      return { ...message, read: true };
    }

    if (senderId === String(userId)) {
      return { ...message, read: message?.read ?? true };
    }

    return message;
  });
}
