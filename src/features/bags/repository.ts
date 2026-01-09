import { pool, withTransaction } from '../../infrastructure/database/index';
import type {
  CreateBagRequest,
  CachedBag,
  CachedFinderPageData,
  CachedContact,
} from '../../client/types/index';
import { formatContactValue } from '../../infrastructure/utils/formatting';
import {
  encryptField,
  decryptField,
  hashForLookup,
} from '../../infrastructure/security/encryption.js';
import { cacheGet, cacheSet } from '../../infrastructure/cache/index.js';
import { logger } from '../../infrastructure/logger/index.js';
import { TIME_SECONDS as t } from '../../client/constants/timeConstants.js';

export interface Bag {
  id: string;
  short_id: string;
  owner_name?: string;
  bag_name?: string;
  owner_message?: string;
  owner_email?: string;
  secure_messaging_enabled: boolean;
  opt_out_timestamp?: Date;
  opt_out_ip_address?: string;
  status: 'active' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

export interface Contact {
  id: string;
  bag_id: string;
  type:
    | 'sms'
    | 'whatsapp'
    | 'email'
    | 'instagram'
    | 'telegram'
    | 'signal'
    | 'other';
  value: string;
  is_primary?: boolean;
  display_order?: number;
  label?: string;
  created_at: Date;
}

export async function createBag(
  data: CreateBagRequest,
  shortId: string,
  ipAddress?: string
): Promise<Bag> {
  return withTransaction(async (client) => {
    const secureMessagingEnabled = data.secure_messaging_enabled !== false;
    const optOutTimestamp = !secureMessagingEnabled ? new Date() : null;
    const optOutIpAddress = !secureMessagingEnabled ? ipAddress : null;

    const ownerEmail = secureMessagingEnabled ? data.owner_email : null;
    const ownerEmailEncrypted = ownerEmail ? encryptField(ownerEmail) : null;
    const ownerEmailHash = ownerEmail ? hashForLookup(ownerEmail) : null;

    const bagResult = await client.query(
      `INSERT INTO bags (
        short_id, owner_name, bag_name, owner_message, owner_email, owner_email_hash,
        secure_messaging_enabled, opt_out_timestamp, opt_out_ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        shortId,
        data.owner_name || null,
        data.bag_name || null,
        data.owner_message || null,
        ownerEmailEncrypted,
        ownerEmailHash,
        secureMessagingEnabled,
        optOutTimestamp,
        optOutIpAddress,
      ]
    );

    const bag = bagResult.rows[0];

    if (data.contacts && data.contacts.length > 0) {
      for (let i = 0; i < data.contacts.length; i++) {
        const contact = data.contacts[i];
        if (contact) {
          await client.query(
            `INSERT INTO contacts (
              bag_id, type, value, is_primary, display_order, label
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              bag.id,
              contact.type,
              encryptField(contact.value),
              contact.is_primary || i === 0,
              i,
              contact.label || null,
            ]
          );
        }
      }
    }

    return {
      ...bag,
      owner_email: decryptField(bag.owner_email),
    };
  });
}

export async function getBagByShortId(shortId: string): Promise<Bag | null> {
  const cached = await cacheGet<CachedBag>(`bag:short:${shortId}`, 'bag');
  if (cached) {
    logger.debug('Bag cache HIT', { shortId });
    return {
      ...cached,
      owner_email: cached.owner_email
        ? (decryptField(cached.owner_email) ?? undefined)
        : undefined,
    };
  }

  const result = await pool.query('SELECT * FROM bags WHERE short_id = $1', [
    shortId,
  ]);
  const bag = result.rows[0];
  if (!bag) return null;

  await cacheSet(`bag:short:${shortId}`, bag, t.ONE_HOUR, 'bag');
  logger.debug('Bag cache warmed from DB', { shortId });

  return {
    ...bag,
    owner_email: decryptField(bag.owner_email) ?? undefined,
  };
}

export async function getFinderPageData(shortId: string) {
  const bag = await getBagByShortId(shortId);
  if (!bag) return null;

  if (bag.status === 'disabled') {
    return { status: 'disabled' as const };
  }

  const cached = await cacheGet<CachedFinderPageData>(
    `bag:finder:${shortId}`,
    'bag_finder'
  );
  if (cached) {
    logger.debug('Bag finder page cache HIT', { shortId });
    const contactOptions = cached.contact_options_encrypted.map(
      (contact: CachedContact) => {
        const decryptedValue = decryptField(contact.value) ?? '';
        return {
          type: contact.type,
          value: formatContactValue(contact.type, decryptedValue),
          label: contact.label,
          is_primary: contact.is_primary,
        };
      }
    );
    return {
      status: 'active' as const,
      short_id: cached.short_id,
      owner_name: cached.owner_name,
      bag_name: cached.bag_name,
      owner_message: cached.owner_message,
      secure_messaging_enabled: cached.secure_messaging_enabled,
      contact_options: contactOptions,
    };
  }

  const contactsResult = await pool.query(
    `SELECT type, value, is_primary, label
     FROM contacts
     WHERE bag_id = $1
     ORDER BY display_order, created_at`,
    [bag.id]
  );

  const contactOptions = contactsResult.rows.map(
    (contact: {
      type: string;
      value: string;
      is_primary: boolean;
      label: string | null;
    }) => {
      const decryptedValue = decryptField(contact.value) ?? '';
      return {
        type: contact.type,
        value: formatContactValue(contact.type, decryptedValue),
        label: contact.label || getContactLabel(contact.type),
        is_primary: contact.is_primary || false,
      };
    }
  );

  const cacheData = {
    short_id: bag.short_id,
    owner_name: bag.owner_name,
    bag_name: bag.bag_name,
    owner_message: bag.owner_message,
    secure_messaging_enabled: bag.secure_messaging_enabled,
    contact_options_encrypted: contactsResult.rows,
  };

  await cacheSet(`bag:finder:${shortId}`, cacheData, t.ONE_HOUR, 'bag_finder');
  logger.debug('Bag finder page cache warmed from DB', { shortId });

  return {
    status: 'active' as const,
    short_id: bag.short_id,
    owner_name: bag.owner_name,
    bag_name: bag.bag_name,
    owner_message: bag.owner_message,
    secure_messaging_enabled: bag.secure_messaging_enabled,
    contact_options: contactOptions,
  };
}

export async function getContactsByBagId(bagId: string): Promise<Contact[]> {
  const result = await pool.query('SELECT * FROM contacts WHERE bag_id = $1', [
    bagId,
  ]);
  return result.rows.map((contact) => ({
    ...contact,
    value: decryptField(contact.value) ?? '',
  }));
}

export async function getBagId(shortId: string): Promise<string | null> {
  const result = await pool.query('SELECT id FROM bags WHERE short_id = $1', [
    shortId,
  ]);
  return result.rows[0]?.id || null;
}

export async function getBagsByOwnerEmail(ownerEmail: string): Promise<Bag[]> {
  const ownerEmailHash = hashForLookup(ownerEmail);

  const result = await pool.query(
    'SELECT * FROM bags WHERE owner_email_hash = $1 ORDER BY created_at DESC',
    [ownerEmailHash]
  );

  return result.rows.map((row) => ({
    ...row,
    owner_email: decryptField(row.owner_email) ?? undefined,
  }));
}

function getContactLabel(type: string): string {
  switch (type) {
    case 'sms':
      return 'Phone Number';
    case 'whatsapp':
      return 'WhatsApp';
    case 'email':
      return 'Email';
    case 'instagram':
      return 'Instagram';
    case 'telegram':
      return 'Telegram';
    case 'signal':
      return 'Signal';
    case 'other':
      return 'Contact';
    default:
      return 'Contact owner';
  }
}
