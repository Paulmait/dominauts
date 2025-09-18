/**
 * API Server Entry Point
 * Handles all server-side API routes
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  adminLogin,
  requestPasswordReset,
  resetPassword,
  verifySession
} from './auth';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later'
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100 // limit each IP to 100 requests per minute
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  const response = await register(req as any);
  const data = await response.json();
  res.status(response.status).json(data);
});

app.post('/api/auth/login', async (req, res) => {
  const response = await login(req as any);
  const data = await response.json();
  res.status(response.status).json(data);
});

app.post('/api/auth/admin/login', async (req, res) => {
  const response = await adminLogin(req as any);
  const data = await response.json();
  res.status(response.status).json(data);
});

app.post('/api/auth/password/reset-request', async (req, res) => {
  const response = await requestPasswordReset(req as any);
  const data = await response.json();
  res.status(response.status).json(data);
});

app.post('/api/auth/password/reset', async (req, res) => {
  const response = await resetPassword(req as any);
  const data = await response.json();
  res.status(response.status).json(data);
});

app.get('/api/auth/verify', async (req, res) => {
  const response = await verifySession(req as any);
  const data = await response.json();
  res.status(response.status).json(data);
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
  });
}

export default app;