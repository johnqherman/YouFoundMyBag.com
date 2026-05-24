import { config } from '../../infrastructure/config/index.js';
import { logger } from '../../infrastructure/logger/index.js';
import { createReadableShortId } from '../../infrastructure/utils/short-id.js';
import * as repository from './repository.js';
import { CreateBagRequest } from '../../client/types/index.js';
import { sendBagCreated } from '../../infrastructure/email/service.js';

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

  if (bag.owner_email && bag.secure_messaging_enabled) {
    try {
      await sendBagCreated({
        email: bag.owner_email,
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
    owner_name: bag.owner_name,
    bag_name: bag.bag_name,
    created_at: bag.created_at.toISOString(),
  };
}

export async function rotateBagShortId(
  bagId: string,
  bypassCooldown = false
): Promise<{
  new_short_id: string;
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

  await repository.rotateShortId(bagId, newShortId, bypassCooldown);

  const bagUrl = `${config.FRONTEND_URL}/b/${newShortId}`;

  return {
    new_short_id: newShortId,
    url: bagUrl,
  };
}
