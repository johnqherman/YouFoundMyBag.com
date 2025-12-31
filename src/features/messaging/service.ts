import crypto from 'crypto';
import { sendContactEmail } from '../../infrastructure/email/index.js';
import {
  getBagId,
  getContactsByBagId,
  getBagByShortId,
} from '../bags/repository.js';
import * as messageRepository from './repository.js';

export function getClientIpHash(req: any): string {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  return crypto
    .createHash('sha256')
    .update(clientIp)
    .digest('hex')
    .substring(0, 16);
}

export async function verifyTurnstile(
  token: string,
  remoteip?: string
): Promise<boolean> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.warn('Turnstile secret key not configured');
    return true;
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          ...(remoteip && { remoteip }),
        }),
      }
    );

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}

export async function sendMessageToBagOwner(
  shortId: string,
  messageData: any,
  ipHash: string
) {
  const turnstileValid = await verifyTurnstile(messageData.turnstile_token);
  if (!turnstileValid) {
    throw new Error('Please complete the security verification');
  }

  const bagId = await getBagId(shortId);
  if (!bagId) {
    throw new Error('Bag not found');
  }

  const message = await messageRepository.saveMessage(
    bagId,
    messageData.from_message,
    messageData.sender_info,
    ipHash
  );

  const [bag, contacts] = await Promise.all([
    getBagByShortId(shortId),
    getContactsByBagId(bagId),
  ]);

  try {
    await sendContactEmail(
      contacts,
      messageData.from_message,
      messageData.sender_info,
      bag?.display_name
    );
    console.log(`Message sent via email relay for bag ${shortId}`);
  } catch (emailError) {
    console.error(
      `Failed to send email relay for bag ${shortId}:`,
      emailError
    );
  }

  return message;
}
