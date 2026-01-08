import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  if (!config.APP_ENCRYPTION_KEY) {
    throw new Error('APP_ENCRYPTION_KEY is not configured');
  }

  const key = Buffer.from(config.APP_ENCRYPTION_KEY, 'hex');

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `Invalid encryption key length: expected ${KEY_LENGTH} bytes, got ${key.length} bytes`
    );
  }

  return key;
}

export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return plaintext;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return encryptedData;
  }

  if (!encryptedData.includes(':')) {
    logger.warn('Attempted to decrypt data that is not in encrypted format');
    return encryptedData;
  }

  try {
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const ivHex = parts[0];
    const authTagHex = parts[1];
    const encrypted = parts[2];

    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted data parts');
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

export function isEncrypted(data: string): boolean {
  if (!data) {
    return false;
  }

  const parts = data.split(':');
  if (parts.length !== 3) {
    return false;
  }

  const hexPattern = /^[0-9a-f]+$/i;
  return parts.every((part) => hexPattern.test(part));
}

export function encryptField(value: string | null | undefined): string | null {
  if (!value) {
    return value ?? null;
  }

  if (!config.APP_ENCRYPTION_KEY) {
    return value;
  }

  return encrypt(value);
}

export function decryptField(value: string | null | undefined): string | null {
  if (!value) {
    return value ?? null;
  }

  if (!config.APP_ENCRYPTION_KEY) {
    return value;
  }

  if (!isEncrypted(value)) {
    return value;
  }

  try {
    return decrypt(value);
  } catch (error) {
    logger.warn('Failed to decrypt field, returning as-is');
    return value;
  }
}

export function hashForLookup(value: string): string {
  if (!config.APP_ENCRYPTION_KEY) {
    throw new Error('Cannot hash without encryption key configured');
  }

  return crypto
    .createHmac('sha256', config.APP_ENCRYPTION_KEY)
    .update(value.toLowerCase().trim())
    .digest('hex');
}
