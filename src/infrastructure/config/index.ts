import { z } from 'zod';
import fs from 'fs';

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

  CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@youfoundmybag.com'),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_REQUIRE_TLS: z.coerce.boolean().default(true),
  SMTP_REJECT_UNAUTHORIZED: z.coerce.boolean().default(true),
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
