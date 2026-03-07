import { pool, withTransaction } from '../../infrastructure/database/index.js';
import {
  CreateBagRequest,
  CachedBag,
  CachedFinderPageData,
  CachedContact,
} from '../../client/types/index.js';
import { formatContactValue } from '../../infrastructure/utils/formatting.js';
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
import { Bag, Contact } from '../types/index.js';
import * as billingService from '../billing/service.js';

export async function createBag(
  data: CreateBagRequest,
  shortId: string,
  ipAddress?: string
): Promise<Bag> {
  const secureMessagingEnabled = data.secure_messaging_enabled !== false;
  const optOutTimestamp = !secureMessagingEnabled ? new Date() : null;
  const optOutIpAddress = !secureMessagingEnabled ? ipAddress : null;

  const ownerEmail = secureMessagingEnabled ? data.owner_email : null;
  const ownerEmailEncrypted = ownerEmail ? encryptField(ownerEmail) : null;
  const ownerEmailHash = ownerEmail ? hashForLookup(ownerEmail) : null;

  const contacts =
    data.contacts && data.contacts.length > 0
      ? data.contacts.map((contact, i) => ({
          type: contact.type,
          value: encryptField(contact.value),
          is_primary: contact.is_primary || i === 0,
          display_order: i,
          label: contact.label || null,
        }))
      : null;

  const result = await pool.query(
    `SELECT create_bag_with_contacts($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) as bag_id`,
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
      contacts ? JSON.stringify(contacts) : null,
    ]
  );

  const bagId = result.rows[0].bag_id;
  const bag = await getBagById(bagId);
  if (!bag) throw new Error('Failed to create bag');

  return bag;
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
      owner_name: cached.owner_name_override ?? cached.owner_name,
      bag_name: cached.bag_name,
      owner_message: cached.owner_message,
      secure_messaging_enabled: cached.secure_messaging_enabled,
      contact_options: contactOptions,
      show_branding: cached.show_branding ?? true,
      tag_color_start: cached.tag_color_start ?? null,
      tag_color_end: cached.tag_color_end ?? null,
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

  const bagRow = await pool.query(
    'SELECT owner_email_hash, tag_color_start, tag_color_end, show_branding FROM bags WHERE id = $1',
    [bag.id]
  );
  const ownerEmailHash = bagRow.rows[0]?.owner_email_hash;
  const bagShowBranding: boolean | null = bagRow.rows[0]?.show_branding ?? null;
  const tagColorStart: string | null = bagRow.rows[0]?.tag_color_start ?? null;
  const tagColorEnd: string | null = bagRow.rows[0]?.tag_color_end ?? null;

  let showBranding: boolean;
  if (bagShowBranding !== null) {
    showBranding = bagShowBranding;
  } else if (ownerEmailHash) {
    const planInfo = await billingService.resolvePlan(ownerEmailHash);
    showBranding = planInfo.showBranding;
  } else {
    showBranding = true;
  }

  const cacheData: CachedFinderPageData = {
    short_id: bag.short_id,
    owner_name: bag.owner_name,
    owner_name_override: bag.owner_name_override,
    bag_name: bag.bag_name,
    owner_message: bag.owner_message,
    secure_messaging_enabled: bag.secure_messaging_enabled,
    contact_options_encrypted: contactsResult.rows,
    show_branding: showBranding,
    tag_color_start: tagColorStart,
    tag_color_end: tagColorEnd,
  };

  await cacheSet(`bag:finder:${shortId}`, cacheData, t.ONE_HOUR, 'bag_finder');
  logger.debug('Bag finder page cache warmed from DB', { shortId });

  return {
    status: 'active' as const,
    short_id: bag.short_id,
    owner_name: bag.owner_name_override ?? bag.owner_name,
    bag_name: bag.bag_name,
    owner_message: bag.owner_message,
    secure_messaging_enabled: bag.secure_messaging_enabled,
    contact_options: contactOptions,
    show_branding: showBranding,
    tag_color_start: tagColorStart,
    tag_color_end: tagColorEnd,
  };
}

export async function getBagAppearance(bagId: string): Promise<{
  tag_color_start: string | null;
  tag_color_end: string | null;
  show_branding: boolean | null;
} | null> {
  const result = await pool.query(
    'SELECT tag_color_start, tag_color_end, show_branding FROM bags WHERE id = $1',
    [bagId]
  );
  if (result.rows.length === 0) return null;
  return {
    tag_color_start: result.rows[0].tag_color_start ?? null,
    tag_color_end: result.rows[0].tag_color_end ?? null,
    show_branding: result.rows[0].show_branding ?? null,
  };
}

export async function updateBagAppearance(
  bagId: string,
  appearance: {
    tag_color_start: string | null;
    tag_color_end: string | null;
    show_branding: boolean | null;
  }
): Promise<void> {
  await pool.query(
    'UPDATE bags SET tag_color_start = $1, tag_color_end = $2, show_branding = $3, updated_at = NOW() WHERE id = $4',
    [
      appearance.tag_color_start,
      appearance.tag_color_end,
      appearance.show_branding,
      bagId,
    ]
  );

  const bag = await pool.query('SELECT short_id FROM bags WHERE id = $1', [
    bagId,
  ]);
  if (bag.rows[0]) {
    await cacheDel(`bag:short:${bag.rows[0].short_id}`, 'bag');
    await cacheDel(`bag:finder:${bag.rows[0].short_id}`, 'bag_finder');
  }

  logger.info(`Updated appearance for bag ${bagId}`);
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

export async function updateBagOwnerNameOverride(
  bagId: string,
  ownerNameOverride: string | null
): Promise<void> {
  await pool.query(
    'UPDATE bags SET owner_name_override = $1, updated_at = NOW() WHERE id = $2',
    [ownerNameOverride || null, bagId]
  );
  const bag = await pool.query('SELECT short_id FROM bags WHERE id = $1', [
    bagId,
  ]);
  if (bag.rows[0]) {
    await cacheDel(`bag:short:${bag.rows[0].short_id}`, 'bag');
    await cacheDel(`bag:finder:${bag.rows[0].short_id}`, 'bag_finder');
  }
  logger.info(`Updated owner name override for bag ${bagId}`);
}

export async function updateOwnerNameForEmail(
  ownerEmail: string,
  ownerName: string
): Promise<void> {
  const ownerEmailHash = hashForLookup(ownerEmail);
  await pool.query(
    'UPDATE bags SET owner_name = $1, updated_at = NOW() WHERE owner_email_hash = $2',
    [ownerName || null, ownerEmailHash]
  );
  await cacheDel(`conversations:owner:${ownerEmailHash}`, 'dashboard');
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
  newShortId: string,
  bypassCooldown = false
): Promise<void> {
  const bagResult = await pool.query(
    'SELECT short_id FROM bags WHERE id = $1',
    [bagId]
  );
  const oldShortId = bagResult.rows[0]?.short_id;

  if (!oldShortId) {
    throw new Error('Bag not found');
  }

  if (bypassCooldown) {
    await withTransaction(async (client) => {
      await client.query(
        'INSERT INTO short_id_history (bag_id, short_id, replaced_at) VALUES ($1, $2, NOW())',
        [bagId, oldShortId]
      );
      await client.query(
        'UPDATE bags SET short_id = $1, last_rotation = NOW(), rotation_count = COALESCE(rotation_count, 0) + 1 WHERE id = $2',
        [newShortId, bagId]
      );
    });
  } else {
    try {
      await pool.query('SELECT rotate_short_id($1, $2)', [bagId, newShortId]);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to rotate short ID');
    }
  }

  await cacheDel(`bag:short:${oldShortId}`, 'bag');
  await cacheDel(`bag:finder:${oldShortId}`, 'bag_finder');
  logger.info(
    `Rotated short_id for bag ${bagId}: ${oldShortId} -> ${newShortId}`
  );
}

export async function updateBagName(
  bagId: string,
  newName: string,
  bypassCooldown = false
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (bypassCooldown) {
      await client.query("SET LOCAL app.bypass_name_cooldown = 'true'");
    }
    await client.query('UPDATE bags SET bag_name = $1 WHERE id = $2', [
      newName,
      bagId,
    ]);
    await client.query('COMMIT');

    const bag = await pool.query('SELECT short_id FROM bags WHERE id = $1', [
      bagId,
    ]);
    if (bag.rows[0]) {
      await cacheDel(`bag:short:${bag.rows[0].short_id}`, 'bag');
      await cacheDel(`bag:finder:${bag.rows[0].short_id}`, 'bag_finder');
    }

    logger.info(`Updated bag name for bag ${bagId} to "${newName}"`);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof Error && error.message.includes('once per week')) {
      throw error;
    }
    throw new Error('Failed to update bag name');
  } finally {
    client.release();
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
