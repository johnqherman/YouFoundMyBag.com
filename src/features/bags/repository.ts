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
import {
  cacheGet,
  cacheSet,
  cacheDel,
} from '../../infrastructure/cache/index.js';
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
          label: contact.label || getContactLabel(contact.type),
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

export async function getBagById(bagId: string): Promise<Bag | null> {
  const result = await pool.query('SELECT * FROM bags WHERE id = $1', [bagId]);
  if (result.rows.length === 0) return null;

  return {
    ...result.rows[0],
    owner_email: decryptField(result.rows[0].owner_email) ?? undefined,
  };
}

export async function canRotateShortId(bagId: string): Promise<{
  canRotate: boolean;
  nextRotationAt?: Date;
}> {
  const result = await pool.query(
    'SELECT can_rotate_short_id($1) as can_rotate, last_rotation FROM bags WHERE id = $1',
    [bagId]
  );

  const row = result.rows[0];
  const canRotate = row?.can_rotate ?? true;
  const lastRotation = row?.last_rotation;

  if (!canRotate && lastRotation) {
    const nextRotationAt = new Date(lastRotation);
    nextRotationAt.setDate(nextRotationAt.getDate() + 7);
    return { canRotate: false, nextRotationAt };
  }

  return { canRotate: true };
}

export async function rotateShortId(
  bagId: string,
  newShortId: string
): Promise<void> {
  return withTransaction(async (client) => {
    const cooldownCheck = await canRotateShortId(bagId);
    if (!cooldownCheck.canRotate) {
      const nextDate = cooldownCheck.nextRotationAt?.toISOString();
      throw new Error(
        `Short link can only be rotated once per week. Next rotation allowed after ${nextDate}`
      );
    }

    const bagResult = await client.query(
      'SELECT short_id, rotation_count FROM bags WHERE id = $1',
      [bagId]
    );
    const oldShortId = bagResult.rows[0]?.short_id;
    const rotationCount = bagResult.rows[0]?.rotation_count ?? 0;

    if (!oldShortId) {
      throw new Error('Bag not found');
    }

    await client.query(
      'INSERT INTO short_id_history (bag_id, short_id) VALUES ($1, $2)',
      [bagId, oldShortId]
    );

    await client.query(
      'UPDATE bags SET short_id = $1, last_rotation = NOW(), rotation_count = $2, updated_at = NOW() WHERE id = $3',
      [newShortId, rotationCount + 1, bagId]
    );

    await cacheDel(`bag:short:${oldShortId}`, 'bag');
    await cacheDel(`bag:finder:${oldShortId}`, 'bag_finder');
    logger.info(
      `Rotated short_id for bag ${bagId}: ${oldShortId} -> ${newShortId}`
    );
  });
}

export async function updateBagName(
  bagId: string,
  newName: string
): Promise<void> {
  try {
    await pool.query('UPDATE bags SET bag_name = $1 WHERE id = $2', [
      newName,
      bagId,
    ]);

    const bag = await pool.query('SELECT short_id FROM bags WHERE id = $1', [
      bagId,
    ]);
    if (bag.rows[0]) {
      await cacheDel(`bag:short:${bag.rows[0].short_id}`, 'bag');
      await cacheDel(`bag:finder:${bag.rows[0].short_id}`, 'bag_finder');
    }

    logger.info(`Updated bag name for bag ${bagId} to "${newName}"`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('once per week')) {
      throw error;
    }
    throw new Error('Failed to update bag name');
  }
}

export async function canUpdateBagName(bagId: string): Promise<{
  canUpdate: boolean;
  nextUpdateAt?: Date;
}> {
  const result = await pool.query(
    'SELECT can_update_bag_name($1) as can_update, last_name_update FROM bags WHERE id = $1',
    [bagId]
  );

  const row = result.rows[0];
  const canUpdate = row?.can_update ?? true;
  const lastUpdate = row?.last_name_update;

  if (!canUpdate && lastUpdate) {
    const nextUpdateAt = new Date(lastUpdate);
    nextUpdateAt.setDate(nextUpdateAt.getDate() + 7);
    return { canUpdate: false, nextUpdateAt };
  }

  return { canUpdate: true };
}

export async function updateBagStatus(
  bagId: string,
  status: 'active' | 'disabled'
): Promise<void> {
  await pool.query(
    'UPDATE bags SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, bagId]
  );

  const bag = await pool.query('SELECT short_id FROM bags WHERE id = $1', [
    bagId,
  ]);
  if (bag.rows[0]) {
    await cacheDel(`bag:short:${bag.rows[0].short_id}`, 'bag');
    await cacheDel(`bag:finder:${bag.rows[0].short_id}`, 'bag_finder');
  }

  const historyResult = await pool.query(
    'SELECT short_id FROM short_id_history WHERE bag_id = $1',
    [bagId]
  );
  for (const row of historyResult.rows) {
    await cacheDel(`bag:short:${row.short_id}`, 'bag');
    await cacheDel(`bag:finder:${row.short_id}`, 'bag_finder');
  }

  logger.info(
    `Updated bag ${bagId} status to ${status}, cleared ${historyResult.rows.length + 1} cache entries`
  );
}

export async function deleteBag(bagId: string): Promise<void> {
  return withTransaction(async (client) => {
    const bagResult = await client.query(
      'SELECT short_id FROM bags WHERE id = $1',
      [bagId]
    );
    const shortId = bagResult.rows[0]?.short_id;

    await client.query('DELETE FROM bags WHERE id = $1', [bagId]);

    if (shortId) {
      await cacheDel(`bag:short:${shortId}`, 'bag');
      await cacheDel(`bag:finder:${shortId}`, 'bag_finder');
    }

    logger.info(`Deleted bag ${bagId}`);
  });
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
