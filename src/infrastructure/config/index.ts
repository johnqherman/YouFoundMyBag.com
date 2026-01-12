import { z } from 'zod';
import fs from 'fs';
import { TIME_MS as t } from '../../client/constants/timeConstants.js';

const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().default('postgresql://localhost:5432/youfoundmybag'),

  DATABASE_SSL_MODE: z
    .enum(['disable', 'require', 'verify-ca', 'verify-full'])
    .default('disable'),
  DATABASE_SSL_CA_PATH: z.string().optional(),
  DATABASE_SSL_CERT_PATH: z.string().optional(),
  DATABASE_SSL_KEY_PATH: z.string().optional(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS_ENABLED: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
  REDIS_MAX_RETRIES: z.coerce.number().default(3),
  REDIS_CONNECT_TIMEOUT: z.coerce.number().default(t.TEN_SECONDS),
  REDIS_COMMAND_TIMEOUT: z.coerce.number().default(t.FIVE_SECONDS),

  CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@youfoundmybag.com'),
  SMTP_SECURE: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
  SMTP_REQUIRE_TLS: z
    .string()
    .optional()
    .default('true')
    .transform((val) => val === 'true'),
  SMTP_REJECT_UNAUTHORIZED: z
    .string()
    .optional()
    .default('true')
    .transform((val) => val === 'true'),
  APP_ENCRYPTION_KEY: z.string().optional(),
});

function loadConfig() {
  try {
    const parsed = configSchema.parse(process.env);

    if (
      parsed.DATABASE_SSL_MODE === 'verify-ca' ||
      parsed.DATABASE_SSL_MODE === 'verify-full'
    ) {
      if (!parsed.DATABASE_SSL_CA_PATH) {
        throw new Error(
          `DATABASE_SSL_MODE=${parsed.DATABASE_SSL_MODE} requires DATABASE_SSL_CA_PATH`
        );
      }
      if (!fs.existsSync(parsed.DATABASE_SSL_CA_PATH)) {
        throw new Error(
          `Database SSL CA certificate not found: ${parsed.DATABASE_SSL_CA_PATH}`
        );
      }
    }

    if (
      parsed.DATABASE_SSL_CERT_PATH &&
      !fs.existsSync(parsed.DATABASE_SSL_CERT_PATH)
    ) {
      throw new Error(
        `Database SSL client certificate not found: ${parsed.DATABASE_SSL_CERT_PATH}`
      );
    }

    if (
      parsed.DATABASE_SSL_KEY_PATH &&
      !fs.existsSync(parsed.DATABASE_SSL_KEY_PATH)
    ) {
      throw new Error(
        `Database SSL client key not found: ${parsed.DATABASE_SSL_KEY_PATH}`
      );
    }

    if (parsed.APP_ENCRYPTION_KEY) {
      const keyBuffer = Buffer.from(parsed.APP_ENCRYPTION_KEY, 'hex');
      if (keyBuffer.length !== 32) {
        throw new Error(
          'APP_ENCRYPTION_KEY must be 64 hex characters (32 bytes)'
        );
      }
    } else if (parsed.NODE_ENV === 'production') {
      throw new Error('APP_ENCRYPTION_KEY is required in production');
    }

    return parsed;
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }
}

export const config = loadConfig();
