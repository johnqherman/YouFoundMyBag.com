import { pool, withTransaction } from '../../infrastructure/database/index.js';
import type { CreateBagRequest } from '../../client/types/index.js';

export interface Bag {
  id: string;
  short_id: string;
  owner_name?: string;
  bag_name?: string;
  owner_message?: string;
  owner_email: string;
  status: 'active' | 'recovered' | 'archived';
  created_at: Date;
  updated_at: Date;
}

export interface Contact {
  id: string;
  bag_id: string;
  type: 'email' | 'sms' | 'signal' | 'whatsapp' | 'telegram';
  value: string;
  allow_direct_display: boolean;
}

export async function createBag(
  data: CreateBagRequest,
  shortId: string
): Promise<Bag> {
  return withTransaction(async (client) => {
    const bagResult = await client.query(
      'INSERT INTO bags (short_id, owner_name, bag_name, owner_message, owner_email) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        shortId,
        data.owner_name || null,
        data.bag_name || null,
        data.owner_message || null,
        data.owner_email,
      ]
    );

    const bag = bagResult.rows[0];

    for (const contact of data.contacts) {
      await client.query(
        'INSERT INTO contacts (bag_id, type, value, allow_direct_display) VALUES ($1, $2, $3, $4)',
        [
          bag.id,
          contact.type,
          contact.value,
          contact.allow_direct_display || false,
        ]
      );
    }

    return bag;
  });
}

export async function getBagByShortId(shortId: string): Promise<Bag | null> {
  const result = await pool.query('SELECT * FROM bags WHERE short_id = $1', [
    shortId,
  ]);
  return result.rows[0] || null;
}

export async function getFinderPageData(shortId: string) {
  const bag = await getBagByShortId(shortId);
  if (!bag) return null;

  const contactsResult = await pool.query(
    'SELECT type, value, allow_direct_display FROM contacts WHERE bag_id = $1',
    [bag.id]
  );

  const contactOptions = contactsResult.rows.map(
    (contact: {
      type: string;
      value: string;
      allow_direct_display: boolean;
    }) => ({
      type: contact.type,
      label: getContactLabel(contact.type),
      direct_contact: contact.allow_direct_display ? contact.value : undefined,
    })
  );

  return {
    short_id: bag.short_id,
    owner_name: bag.owner_name,
    bag_name: bag.bag_name,
    owner_message: bag.owner_message,
    contact_options: contactOptions,
  };
}

export async function getContactsByBagId(bagId: string): Promise<Contact[]> {
  const result = await pool.query('SELECT * FROM contacts WHERE bag_id = $1', [
    bagId,
  ]);
  return result.rows;
}

export async function getBagId(shortId: string): Promise<string | null> {
  const result = await pool.query('SELECT id FROM bags WHERE short_id = $1', [
    shortId,
  ]);
  return result.rows[0]?.id || null;
}

function getContactLabel(type: string): string {
  switch (type) {
    case 'email':
      return 'Send email';
    case 'sms':
      return 'Text message';
    case 'signal':
      return 'Signal message';
    case 'whatsapp':
      return 'WhatsApp message';
    case 'telegram':
      return 'Telegram message';
    default:
      return 'Contact owner';
  }
}
