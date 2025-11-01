import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { passwordResetRouter } from './routes/password-reset';
import { assetsRouter } from './routes/assets';
import { pmPlansRouter } from './routes/pmplans';
import { workOrdersRouter } from './routes/workorders';
import { dashboardRouter } from './routes/dashboard';
import usersRouter from './routes/users';
import activityLogRouter from './routes/activity-log';
import auditLogsRouter from './routes/audit-logs';
import adminRouter from './routes/admin';
import path from 'path';
import { logger, httpLogStream } from './utils/logger';

export function createServer() {
  const app = express();
  
  // Trust proxy if behind reverse proxy (Nginx, Apache, etc.)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  
  // Security middleware - Helmet with enhanced settings
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  
  // CORS configuration with enhanced security
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'http://localhost:3000']
    : ['http://localhost:3000', 'http://localhost:3001'];
  
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.) only in development
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'Content-Disposition'],
    maxAge: 600, // 10 minutes
  }));
  
  // Compression middleware
  app.use(compression());
  
  // Cookie parser middleware
  app.use(cookieParser());
  
  // HTTP request logging
  app.use(morgan('combined', { stream: httpLogStream }));
  
  // Body parser with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warn(`Sanitized potentially malicious input in request`, { key, ip: req.ip });
    },
  }));
  
  // Prevent HTTP Parameter Pollution attacks
  app.use(hpp({
    whitelist: ['page', 'limit', 'sort', 'filter'], // Allow these parameters to be duplicated
  }));
  
  // Enhanced rate limiting with different limits for different endpoints
  const generalLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`General rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too many requests, please try again later.'
      });
    },
    skip: (req) => req.path === '/api/health', // Skip rate limiting for health check
  });
  
  // Strict rate limiting for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
      logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`, { 
        path: req.path,
        email: req.body?.email 
      });
      res.status(429).json({
        error: 'Too many login attempts. Please try again later.',
        retryAfter: 900 // seconds
      });
    },
  });
  
  // Apply general rate limiter to all API routes
  app.use('/api/', generalLimiter);
  
  // Apply strict rate limiter to auth endpoints
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/password-reset', authLimiter);
  
  // Static files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });
  
  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/password-reset', passwordResetRouter);
  app.use('/api/assets', assetsRouter);
  app.use('/api/pmplans', pmPlansRouter);
  app.use('/api/workorders', workOrdersRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/activity-logs', activityLogRouter);
  app.use('/api/audit-logs', auditLogsRouter);
  app.use('/api/admin', adminRouter);
  
  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
    
    res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
    });
  });
  
  return app;
}
