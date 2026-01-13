import { Pool, PoolClient } from 'pg';
import fs from 'fs';
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

export async function initializeDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
}
