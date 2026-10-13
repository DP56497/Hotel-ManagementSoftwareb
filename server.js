import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import analyticsRoutes from './routes/analyticsRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import userRoutes from './routes/userRoutes.js';
import tableRoutes from './routes/tableRoutes.js';
import { seedInitialData } from './utils/seedData.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (essential for Vercel, rate limiting, and secure headers)
app.set('trust proxy', 1);

// Flexible CORS for local dev and Vercel deployments (*.vercel.app)
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.length === 0 ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.startsWith('http://localhost:')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Normalize URL in case Vercel rewrites stripped the /api prefix
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && req.url !== '/') {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

let cachedConnectionPromise = null;
export const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGO_URI) {
    console.warn('Warning: MONGO_URI is not set. Please configure MONGO_URI in your environment variables.');
    return null;
  }
  if (!cachedConnectionPromise) {
    cachedConnectionPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    }).then(async (conn) => {
      console.log('MongoDB connected successfully');
      try {
        await seedInitialData();
      } catch (seedErr) {
        console.error('Seed initial data error:', seedErr.message);
      }
      return conn;
    }).catch((err) => {
      cachedConnectionPromise = null;
      console.error('MongoDB connection error:', err.message);
      throw err;
    });
  }
  return cachedConnectionPromise;
};

// Automatic DB connection assurance for Serverless environments (e.g. Vercel)
app.use(async (req, res, next) => {
  try {
    if (process.env.VERCEL || mongoose.connection.readyState !== 1) {
      await connectToDatabase();
    }
  } catch {
    // Proceed to routes even if DB fails initially so /api/health can report state
  }
  next();
});

// Root welcome & API status endpoint (prevents "Cannot GET /" error)
app.get('/', (req, res) => {
  res.json({
    ok: true,
    name: 'Smart Hotel Management System API',
    status: 'online',
    environment: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    healthCheck: '/api/health',
    timestamp: new Date().toISOString()
  });
});

// Root API status endpoint
app.get('/api', (req, res) => {
  res.json({
    ok: true,
    message: 'Smart Hotel Management System API online',
    environment: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Smart Hotel API online',
    environment: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tables', tableRoutes);

const startServer = async () => {
  await connectToDatabase();

  const server = app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process or set a different PORT environment variable.`);
      process.exit(1);
    }
    console.error('Server error', error);
    process.exit(1);
  });
};

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
