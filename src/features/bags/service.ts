import QRCode from 'qrcode';
import { config } from '../../infrastructure/config/index.js';
import { logger } from '../../infrastructure/logger/index.js';
import { createReadableShortId } from '../../infrastructure/utils/short-id.js';
import * as repository from './repository.js';
import type { CreateBagRequest } from '../../client/types/index.js';
import { sendBagCreatedEmail } from '../../infrastructure/email/index.js';

export async function createBagWithQR(
  data: CreateBagRequest,
  ipAddress?: string
) {
  let shortId: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    shortId = createReadableShortId();
    attempts++;

    const existingBagId = await repository.getBagId(shortId);
    if (!existingBagId) break;

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique ID');
    }
  } while (attempts < maxAttempts);

  const bag = await repository.createBag(data, shortId, ipAddress);

  const bagUrl = `${config.FRONTEND_URL}/b/${shortId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(bagUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });

  if (bag.owner_email && bag.secure_messaging_enabled) {
    try {
      await sendBagCreatedEmail({
        email: bag.owner_email,
        ownerName: bag.owner_name,
        bagName: bag.bag_name,
        shortId: bag.short_id,
        bagUrl,
      });
    } catch (emailError) {
      logger.error(
        `Failed to send bag created email to ${bag.owner_email}:`,
        emailError
      );
    }
  }

  return {
    short_id: bag.short_id,
    url: bagUrl,
    qr_code: qrCodeDataUrl,
    owner_name: bag.owner_name,
    bag_name: bag.bag_name,
    created_at: bag.created_at.toISOString(),
  };
}

export async function generateQRCode(bagUrl: string): Promise<string> {
  return QRCode.toDataURL(bagUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
}

export async function getBagQRCode(shortId: string): Promise<{
  qr_code: string;
  url: string;
  short_id: string;
}> {
  const bag = await repository.getBagByShortId(shortId);
  if (!bag) {
    throw new Error('Bag not found');
  }

  const bagUrl = `${config.FRONTEND_URL}/b/${shortId}`;
  const qrCodeDataUrl = await generateQRCode(bagUrl);

  return {
    qr_code: qrCodeDataUrl,
    url: bagUrl,
    short_id: shortId,
  };
}

export async function rotateBagShortId(bagId: string): Promise<{
  new_short_id: string;
  qr_code: string;
  url: string;
}> {
  let newShortId: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    newShortId = createReadableShortId();
    attempts++;

    const existingBagId = await repository.getBagId(newShortId);
    if (!existingBagId) break;

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique ID');
    }
  } while (attempts < maxAttempts);

  await repository.rotateShortId(bagId, newShortId);

  const bagUrl = `${config.FRONTEND_URL}/b/${newShortId}`;
  const qrCodeDataUrl = await generateQRCode(bagUrl);

  return {
    new_short_id: newShortId,
    qr_code: qrCodeDataUrl,
    url: bagUrl,
  };
}
