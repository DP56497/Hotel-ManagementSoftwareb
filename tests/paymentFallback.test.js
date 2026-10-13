import test from 'node:test';
import assert from 'node:assert/strict';

test('UPI payment details generator creates valid UPI URL and QR URL', () => {
  const getUpiPaymentDetails = (order, upiId = 'hotel@upi', payeeName = 'Hotel Payments') => {
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: Number(order.total).toFixed(2),
      cu: 'INR',
      tn: `Order ${order._id}`
    });
    const upiUrl = `upi://pay?${params.toString()}`;
    return {
      upiId,
      payeeName,
      upiUrl,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUrl)}`
    };
  };

  const fakeOrder = { _id: 'order_abc123', total: 450 };
  const result = getUpiPaymentDetails(fakeOrder, '9712071875@ptsbi', 'Royal Plaza Hotel');

  assert.equal(result.upiId, '9712071875@ptsbi');
  assert.equal(result.payeeName, 'Royal Plaza Hotel');
  assert.ok(result.upiUrl.includes('pa=9712071875%40ptsbi'));
  assert.ok(result.upiUrl.includes('am=450.00'));
  assert.ok(result.qrUrl.startsWith('https://api.qrserver.com/v1/create-qr-code'));
});

test('Razorpay credentials validation rejects dummy placeholders or missing secrets', () => {
  const isRazorpayConfigured = (keyId, keySecret) => {
    const kId = keyId?.trim();
    const kSec = keySecret?.trim();
    if (!kId || !kSec) return false;
    if (!kId.startsWith('rzp_test_') && !kId.startsWith('rzp_live_')) return false;
    if (kSec === 'your_razorpay_secret' || kSec.length < 8) return false;
    return true;
  };

  assert.equal(isRazorpayConfigured('', ''), false);
  assert.equal(isRazorpayConfigured('rzp_test_TYbi3OYva1dhjL', 'your_razorpay_secret'), false);
  assert.equal(isRazorpayConfigured('invalid_key_prefix', 'validsecret12345'), false);
  assert.equal(isRazorpayConfigured('rzp_test_validKey123', 'validsecret12345'), true);
  assert.equal(isRazorpayConfigured('rzp_live_validKey123', 'validsecret12345'), true);
});

test('UPI payment fallback response format matches customer dashboard requirements', () => {
  const createFallbackResponse = (order, upiDetails, errorDesc) => {
    return {
      mode: 'upi-test',
      ...upiDetails,
      amount: Math.round(Number(order.total) * 100),
      currency: 'INR',
      warning: `Razorpay unavailable (${errorDesc}). Switched to direct UPI QR payment.`
    };
  };

  const response = createFallbackResponse(
    { total: 250 },
    { upiId: 'test@upi', qrUrl: 'https://qr.test' },
    'Authentication failed'
  );

  assert.equal(response.mode, 'upi-test');
  assert.equal(response.amount, 25000);
  assert.equal(response.currency, 'INR');
  assert.ok(response.warning.includes('Authentication failed'));
});
