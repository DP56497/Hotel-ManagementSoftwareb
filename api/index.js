import app, { connectToDatabase } from '../server.js';

export default async function handler(req, res) {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('Database connection error in Vercel serverless function:', error);
  }
  return app(req, res);
}
