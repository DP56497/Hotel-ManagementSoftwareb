import express from 'express';
import { rateLimit } from 'express-rate-limit';
import nodemailer from 'nodemailer';
import User from '../models/userModel.js';
import {
  comparePassword,
  createAccessToken,
  createOpaqueToken,
  createRefreshToken,
  hashOpaqueToken,
  hashPassword,
  isStrongPassword,
  verifyAccessToken,
  verifyRefreshToken
} from '../utils/auth.js';

const router = express.Router();
const refreshTokenLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const isDevOrLocal = (req) => {
  if (process.env.NODE_ENV !== 'production') return true;
  const ip = req.ip || req.connection?.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1') || req.hostname === 'localhost';
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => isDevOrLocal(req),
  message: { message: 'Too many authentication attempts. Try again later.' }
});

const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const ip = req.ip || 'ip';
    return email ? `${ip}_${email}` : ip;
  },
  validate: { keyGeneratorIpFallback: false },
  skip: (req) => isDevOrLocal(req),
  message: { message: 'Too many password recovery attempts. Try again later.' }
});

const sendResetEmail = async (user, resetToken) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV === 'production') throw new Error('SMTP is not configured');
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const resetUrl = `${process.env.PASSWORD_RESET_URL || 'http://localhost:5173/reset-password'}?token=${encodeURIComponent(resetToken)}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: 'Reset your Royal Plaza Hotel password',
    text: `Use this link to reset your password. It expires in 15 minutes: ${resetUrl}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 6px 16px; border-radius: 9999px; background-color: #fef3c7; color: #b45309; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
            ★ Royal Plaza Hotel Surat ★
          </div>
          <h1 style="color: #0f172a; margin: 16px 0 6px; font-size: 22px; font-weight: 800;">Password Reset Request</h1>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Luxury Hotel Operations & Management Suite</p>
        </div>
        <div style="padding: 24px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
          <p style="font-size: 14px; margin-top: 0; line-height: 1.6;">Hello <strong>${user.name || 'Valued User'}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">We received a request to reset the password for your Royal Plaza account associated with <strong>${user.email}</strong>. Click the button below to set a new secure password:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #d97706, #b45309); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);">Reset Your Password</a>
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin: 20px 0;">
            <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">⏱️ <strong>Time limit:</strong> This link will expire in <strong>15 minutes</strong> for your security.</p>
            <p style="font-size: 12px; color: #64748b; margin: 6px 0 0; line-height: 1.5;">🔒 If you did not request this password reset, please ignore this email or notify your system administrator.</p>
          </div>
          <p style="font-size: 11px; color: #94a3b8; word-break: break-all; margin: 16px 0 0;">Button not working? Copy and paste this link in your browser:<br/><a href="${resetUrl}" style="color: #d97706;">${resetUrl}</a></p>
        </div>
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 24px 0 0;">&copy; ${new Date().getFullYear()} Royal Plaza Hotel Surat. All rights reserved.</p>
      </div>
    `
  });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  staffCategory: user.staffCategory,
  hotelName: user.hotelName,
  tableNumber: user.role === 'customer' ? user.tableNumber : undefined
});

const issueTokens = async (user) => {
  const payload = { id: user._id.toString(), role: user.role, staffCategory: user.staffCategory, email: user.email, name: user.name };
  const accessToken = createAccessToken(payload);
  const refreshToken = createRefreshToken({ id: user._id.toString() });
  user.refreshTokens = (user.refreshTokens || []).filter((entry) => entry.expiresAt > new Date());
  user.refreshTokens.push({ tokenHash: hashOpaqueToken(refreshToken), expiresAt: new Date(Date.now() + refreshTokenLifetimeMs) });
  await user.save();
  return { accessToken, refreshToken };
};

const invalidPassword = (password) => !isStrongPassword(password);

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, role = 'customer', staffCategory, hotelName, tableNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (!['owner', 'manager', 'staff', 'customer'].includes(role)) {
      return res.status(400).json({ message: 'A valid role is required' });
    }
    if (invalidPassword(password)) return res.status(400).json({ message: 'Password must be 8-128 characters and include uppercase, lowercase, number, and symbol' });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const isCustomer = role === 'customer';
    const parsedTableNumber = isCustomer ? (Number(tableNumber) || 1) : undefined;

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      staffCategory: role === 'staff' ? (staffCategory || 'waiter') : undefined,
      hotelName: hotelName || 'Royal Plaza Hotel Surat',
      ...(isCustomer ? { tableNumber: parsedTableNumber } : {})
    });

    const tokens = await issueTokens(user);
    res.status(201).json({ token: tokens.accessToken, ...tokens, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const tokens = await issueTokens(user);
    res.json({ token: tokens.accessToken, ...tokens, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });
    const payload = verifyRefreshToken(refreshToken);
    if (payload.type !== 'refresh') return res.status(401).json({ message: 'Invalid refresh token' });
    const user = await User.findById(payload.id);
    if (!user || !user.active) return res.status(401).json({ message: 'Invalid refresh token' });
    const tokenHash = hashOpaqueToken(refreshToken);
    const storedToken = (user.refreshTokens || []).find((entry) => entry.tokenHash === tokenHash && entry.expiresAt > new Date());
    if (!storedToken) return res.status(401).json({ message: 'Invalid refresh token' });
    user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== tokenHash);
    const tokens = await issueTokens(user);
    res.json({ token: tokens.accessToken, ...tokens, user: publicUser(user) });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await User.updateOne({ 'refreshTokens.tokenHash': hashOpaqueToken(refreshToken) }, { $pull: { refreshTokens: { tokenHash: hashOpaqueToken(refreshToken) } } });
  } finally {
    res.status(204).send();
  }
});

router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const rawToken = String(req.params.token || '').trim();
    if (!rawToken) {
      return res.status(400).json({ valid: false, message: 'Reset token is required' });
    }
    const tokenHash = hashOpaqueToken(rawToken);
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
      active: true
    }).select('email name');

    if (!user) {
      return res.status(400).json({ valid: false, message: 'Invalid or expired password reset link' });
    }

    const maskedEmail = user.email.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => {
      const maskCount = Math.max(1, Math.min(middle.length, 6));
      return `${first}${'*'.repeat(maskCount)}${domain}`;
    });

    res.json({
      valid: true,
      email: maskedEmail,
      name: user.name
    });
  } catch (error) {
    res.status(400).json({ valid: false, message: 'Failed to verify reset token' });
  }
});

router.post('/forgot-password', recoveryLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ message: 'Email address is required' });
  }

  const response = {
    message: 'If an account exists for that email, password reset instructions have been sent.'
  };

  try {
    const user = await User.findOne({ email, active: true }).select('+resetPasswordTokenHash +resetPasswordExpiresAt');
    if (!user) return res.json(response);

    const resetToken = createOpaqueToken();
    user.resetPasswordTokenHash = hashOpaqueToken(resetToken);
    user.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendResetEmail(user, resetToken);

    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = resetToken;
      response.resetUrl = `${process.env.PASSWORD_RESET_URL || 'http://localhost:5173/reset-password'}?token=${encodeURIComponent(resetToken)}`;
    }
    res.json(response);
  } catch (error) {
    res.json(response);
  }
});

router.post('/reset-password', recoveryLimiter, async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const { password } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'A valid reset token is required' });
    }
    if (invalidPassword(password)) {
      return res.status(400).json({ message: 'Password must be 8-128 characters and include uppercase, lowercase, number, and symbol' });
    }

    const user = await User.findOne({
      resetPasswordTokenHash: hashOpaqueToken(token),
      resetPasswordExpiresAt: { $gt: new Date() },
      active: true
    }).select('+resetPasswordTokenHash +resetPasswordExpiresAt');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token. Please request a new password reset link.' });
    }

    user.password = await hashPassword(password);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.refreshTokens = [];
    await user.save();
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Invalid or expired reset token' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'Missing token' });

    const payload = verifyAccessToken(token);
    if (payload.type !== 'access') return res.status(401).json({ message: 'Invalid token' });
    const user = await User.findById(payload.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
