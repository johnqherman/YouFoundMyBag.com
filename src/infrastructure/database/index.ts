import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';
import { TIME_MS as t } from '../../client/constants/timeConstants.js';
import { DatabaseSSLConfig } from '../types/index.js';

function getDatabaseSSLConfig(): DatabaseSSLConfig | false {
  const sslMode = config.DATABASE_SSL_MODE;

  if (sslMode === 'disable') {
    return false;
  }

  const sslConfig: DatabaseSSLConfig = {
    rejectUnauthorized: true,
  };

  if (sslMode === 'verify-ca' || sslMode === 'verify-full') {
    if (config.DATABASE_SSL_CA_PATH) {
      sslConfig.ca = fs.readFileSync(config.DATABASE_SSL_CA_PATH).toString();
    }
  }

  if (config.DATABASE_SSL_CERT_PATH) {
    sslConfig.cert = fs.readFileSync(config.DATABASE_SSL_CERT_PATH).toString();
  }

  if (config.DATABASE_SSL_KEY_PATH) {
    sslConfig.key = fs.readFileSync(config.DATABASE_SSL_KEY_PATH).toString();
  }

  if (config.NODE_ENV === 'development' && !config.DATABASE_SSL_CA_PATH) {
    logger.warn(
      'Development mode: Database SSL certificate verification disabled (no CA certificate provided)'
    );
    sslConfig.rejectUnauthorized = false;
  }

  return sslConfig;
}

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: getDatabaseSSLConfig(),
  max: 20,
  idleTimeoutMillis: t.THIRTY_SECONDS,
  connectionTimeoutMillis: t.TEN_SECONDS,
});

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const LEGACY_SCHEMA_CHECKS: Record<string, string> = {
  '001_add_subscriptions.sql': `
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) AS exists`,
  '002_bag_name_cooldown_bypass.sql': `
    SELECT EXISTS (
      SELECT FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'enforce_bag_name_cooldown'
    ) AS exists`,
  '003_bag_customization.sql': `
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'bags'
        AND column_name = 'tag_color_start'
    ) AS exists`,
};

async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(process.cwd(), 'database', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    logger.debug('No migrations directory found, skipping');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const applied = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    );
    const appliedSet = new Set(applied.rows.map((r) => r.filename));
    const isBootstrap = appliedSet.size === 0;

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        logger.debug(`Migration already applied: ${file}`);
        continue;
      }

      if (isBootstrap) {
        const schemaCheck = LEGACY_SCHEMA_CHECKS[file];
        if (schemaCheck) {
          const checkResult = await client.query<{ exists: boolean }>(
            schemaCheck
          );
          if (checkResult.rows[0]?.exists) {
            await client.query(
              'INSERT INTO schema_migrations (filename) VALUES ($1)',
              [file]
            );
            logger.info(
              `Migration ${file}: schema already present, recorded as applied`
            );
            continue;
          }
        }
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      logger.info(`Applying migration: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        logger.info(`Migration applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(
          `Migration ${file} failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  } finally {
    client.release();
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connected');
    await runMigrations();
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
}
