import QRCode from 'qrcode';
import { config } from '../../infrastructure/config/index.js';
import { createReadableShortId } from '../../infrastructure/utils/short-id.js';
import * as repository from './repository.js';
import type { CreateBagRequest } from '../../client/types/index.js';

export async function createBagWithQR(data: CreateBagRequest) {
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

  const bag = await repository.createBag(data, shortId);

  const bagUrl = `${config.FRONTEND_URL}/b/${shortId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(bagUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  return {
    short_id: bag.short_id,
    url: bagUrl,
    qr_code: qrCodeDataUrl,
    display_name: bag.display_name,
    created_at: bag.created_at.toISOString(),
  };
}
