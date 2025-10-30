import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define schema for environment variables validation
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Server
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  
  // SMTP
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.string().regex(/^\d+$/, 'SMTP_PORT must be a number'),
  SMTP_SECURE: z.string().default('false'),
  SMTP_USER: z.string().email('SMTP_USER must be a valid email'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  SMTP_FROM_NAME: z.string().default('OptiTrack'),
  
  // Frontend
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  
  // Optional Security Settings
  ALLOWED_ORIGINS: z.string().optional(),
  MAX_FILE_SIZE: z.string().regex(/^\d+$/).optional(),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).optional(),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).optional(),
});

// Validate environment variables
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();

// Export typed configuration
export const config = {
  database: {
    url: env.DATABASE_URL,
  },
  server: {
    port: parseInt(env.PORT),
    nodeEnv: env.NODE_ENV,
    isProd: env.NODE_ENV === 'production',
    isDev: env.NODE_ENV === 'development',
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  smtp: {
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT),
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    fromName: env.SMTP_FROM_NAME,
  },
  frontend: {
    url: env.FRONTEND_URL,
  },
  security: {
    allowedOrigins: env.ALLOWED_ORIGINS?.split(',') || [env.FRONTEND_URL],
    maxFileSize: parseInt(env.MAX_FILE_SIZE || '5242880'), // 5MB default
    rateLimit: {
      windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '100'),
    },
  },
} as const;

// Log configuration status (without sensitive data)
if (config.server.isDev) {
  console.log('✅ Configuration loaded successfully');
  console.log(`   Environment: ${config.server.nodeEnv}`);
  console.log(`   Port: ${config.server.port}`);
  console.log(`   Frontend URL: ${config.frontend.url}`);
}
