import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const developmentSecret = crypto.randomBytes(48).toString('hex');

const getSecret = (name) => {
	const secret = process.env[name];
	if (secret) return secret;
	if (process.env.NODE_ENV === 'production') {
		throw new Error(`${name} must be configured`);
	}
	return developmentSecret;
};

export const hashPassword = async (password) => bcrypt.hash(password, 12);

export const comparePassword = async (password, hashedPassword) => bcrypt.compare(password, hashedPassword);

export const createAccessToken = (payload) => jwt.sign({ ...payload, type: 'access' }, getSecret('JWT_ACCESS_SECRET'), { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' });

export const createRefreshToken = (payload) => jwt.sign({ ...payload, type: 'refresh', jti: crypto.randomUUID() }, getSecret('JWT_REFRESH_SECRET'), { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' });

export const createToken = createAccessToken;

export const verifyAccessToken = (token) => jwt.verify(token, getSecret('JWT_ACCESS_SECRET'), { algorithms: ['HS256'] });

export const verifyRefreshToken = (token) => jwt.verify(token, getSecret('JWT_REFRESH_SECRET'), { algorithms: ['HS256'] });

export const verifyToken = verifyAccessToken;

export const createOpaqueToken = () => crypto.randomBytes(32).toString('hex');

export const hashOpaqueToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const isStrongPassword = (password) => typeof password === 'string'
	&& password.length >= 8
	&& password.length <= 128
	&& /[a-z]/.test(password)
	&& /[A-Z]/.test(password)
	&& /\d/.test(password)
	&& /[^A-Za-z0-9]/.test(password);
