import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().default('postgresql://localhost:5432/youfoundmybag'),
  CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@youfoundmybag.com'),
});

function loadConfig() {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }
}

export const config = loadConfig();
