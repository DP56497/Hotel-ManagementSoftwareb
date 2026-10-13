import test from 'node:test';
import assert from 'node:assert/strict';
import { askCopilot } from '../controllers/aiController.js';

test('askCopilot returns dish details when asked about a menu item', async () => {
  const req = {
    body: {
      prompt: 'tell me about dhokla price',
      context: {
        role: 'customer',
        menuItems: [{ name: 'Dhokla', category: 'Gujarati Dish', price: 120 }],
        orders: [],
        expenses: []
      }
    }
  };

  let jsonResult = null;
  const res = {
    json: (data) => {
      jsonResult = data;
    }
  };

  await askCopilot(req, res);
  assert.ok(jsonResult && jsonResult.response);
  assert.match(jsonResult.response, /Dhokla/i);
  assert.match(jsonResult.response, /120/);
});

test('askCopilot calculates financial net revenue accurately', async () => {
  const req = {
    body: {
      prompt: 'what is our profit after costs?',
      context: {
        role: 'owner',
        orders: [{ total: 50000, status: 'Completed' }],
        expenses: [{ category: 'Staff Salary', amount: 10000 }],
        menuItems: []
      }
    }
  };

  let jsonResult = null;
  const res = {
    json: (data) => {
      jsonResult = data;
    }
  };

  await askCopilot(req, res);
  assert.ok(jsonResult && jsonResult.response);
  assert.match(jsonResult.response, /50,000/);
  assert.match(jsonResult.response, /10,000/);
  assert.match(jsonResult.response, /40,000/);
});
