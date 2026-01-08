import crypto from 'crypto';
import type { OwnerSession } from '../../client/types/index.js';
import { logger } from '../../infrastructure/logger/index.js';
import { sendMagicLinkEmail } from '../../infrastructure/email/index.js';
import * as authRepository from './repository.js';
import { TIME_MS as t } from 'client/constants/timeConstants.js';

export async function generateMagicLinkToken(
  email: string,
  conversationId?: string,
  bagIds?: string[]
): Promise<{ magicLinkToken: string; expiresAt: Date }> {
  await authRepository.deleteExpiredSessions();

  const magicLinkToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + t.ONE_DAY);

  let targetBagIds = bagIds;
  if (!targetBagIds) {
    targetBagIds = await authRepository.getBagIdsByOwnerEmail(email);
  }

  const isValidOwner = await authRepository.verifyOwnerEmailForBags(
    email,
    targetBagIds
  );
  if (!isValidOwner) {
    throw new Error('Access denied: Invalid bag ownership');
  }

  await authRepository.createOwnerSession(
    email,
    targetBagIds,
    `magic_${magicLinkToken}`,
    expiresAt,
    conversationId,
    'magic_owner'
  );

  return { magicLinkToken, expiresAt };
}

export async function generateMagicLink(
  email: string,
  conversationId?: string,
  bagIds?: string[],
  bagName?: string
): Promise<{ magicLinkToken: string; expiresAt: Date }> {
  const { magicLinkToken, expiresAt } = await generateMagicLinkToken(
    email,
    conversationId,
    bagIds
  );

  let targetBagIds = bagIds;
  if (!targetBagIds) {
    targetBagIds = await authRepository.getBagIdsByOwnerEmail(email);
  }

  try {
    await sendMagicLinkEmail({
      email,
      magicLinkToken,
      conversationId,
      bagIds: targetBagIds,
      bagName,
    });
    logger.info(`Magic link sent to ${email}`);
  } catch (emailError) {
    logger.error(`Failed to send magic link to ${email}:`, emailError);
    throw new Error('Failed to send magic link email');
  }

  return { magicLinkToken, expiresAt };
}

export async function verifyMagicLink(magicLinkToken: string): Promise<{
  sessionToken: string;
  session: OwnerSession;
}> {
  logger.debug(
    `DEBUG: Verifying magic link token: ${magicLinkToken.substring(0, 8)}...`
  );
  logger.debug(`DEBUG: Token length: ${magicLinkToken.length}`);
  logger.debug(
    `DEBUG: Looking for session key: magic_${magicLinkToken.substring(0, 8)}...`
  );

  const magicSession = await authRepository.getOwnerSession(
    `magic_${magicLinkToken}`
  );
  if (!magicSession) {
    logger.debug(`DEBUG: Magic link token not found in database`);
    logger.debug(`DEBUG: Searched for session key: magic_${magicLinkToken}`);
    throw new Error('Invalid or expired magic link');
  }

  logger.debug(`DEBUG: Found magic session for email: ${magicSession.email}`);

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiresAt = new Date(Date.now() + t.THREE_DAYS);

  logger.debug(
    `DEBUG: Creating new session token: ${sessionToken.substring(0, 8)}...`
  );

  const session = await authRepository.createOwnerSession(
    magicSession.email,
    magicSession.bag_ids,
    sessionToken,
    sessionExpiresAt,
    magicSession.conversation_id,
    'owner'
  );

  logger.debug(
    `DEBUG: Session created successfully for email: ${session.email}`
  );
  return { sessionToken, session };
}

export async function verifyOwnerSession(
  token: string
): Promise<OwnerSession | null> {
  return authRepository.getOwnerSession(token);
}

export async function logout(token: string): Promise<void> {
  await authRepository.deleteOwnerSession(token);
}

export async function getOwnerDashboard(): Promise<{
  bags: Array<{
    id: string;
    short_id: string;
    owner_name?: string;
    bag_name?: string;
    status: 'active' | 'disabled';
    created_at: string;
    conversation_count: number;
    unread_count: number;
    latest_conversation?: string;
  }>;
}> {
  return { bags: [] };
}

export async function generateFinderMagicLinkToken(
  email: string,
  conversationId: string
): Promise<{ magicLinkToken: string; expiresAt: Date }> {
  await authRepository.deleteExpiredSessions();

  const magicLinkToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + t.ONE_DAY);

  await authRepository.createOwnerSession(
    email,
    [],
    `finder_magic_${magicLinkToken}`,
    expiresAt,
    conversationId,
    'magic_finder'
  );

  return { magicLinkToken, expiresAt };
}

export async function generateFinderMagicLink(
  email: string,
  conversationId: string
): Promise<{ magicLinkToken: string; expiresAt: Date }> {
  const { magicLinkToken, expiresAt } = await generateFinderMagicLinkToken(
    email,
    conversationId
  );

  try {
    await import('../../infrastructure/email/index.js').then(
      ({ sendFinderMagicLinkEmail }) =>
        sendFinderMagicLinkEmail({
          email,
          magicLinkToken,
          conversationId,
        })
    );
    logger.info(`Finder magic link sent to ${email}`);
  } catch (emailError) {
    logger.error(`Failed to send finder magic link to ${email}:`, emailError);
    throw new Error('Failed to send finder magic link email');
  }

  return { magicLinkToken, expiresAt };
}

export async function verifyFinderMagicLink(magicLinkToken: string): Promise<{
  sessionToken: string;
  finderEmail: string;
  conversationId: string;
}> {
  logger.debug(
    `DEBUG: Verifying finder magic link token: ${magicLinkToken.substring(0, 8)}...`
  );
  logger.debug(`DEBUG: Finder token length: ${magicLinkToken.length}`);
  logger.debug(
    `DEBUG: Looking for finder session key: finder_magic_${magicLinkToken.substring(0, 8)}...`
  );

  const magicSession = await authRepository.getOwnerSession(
    `finder_magic_${magicLinkToken}`
  );
  if (!magicSession) {
    logger.debug(`DEBUG: Finder magic link token not found in database`);
    logger.debug(
      `DEBUG: Searched for finder session key: finder_magic_${magicLinkToken}`
    );
    throw new Error('Invalid or expired magic link');
  }

  logger.debug(
    `DEBUG: Found finder magic session for email: ${magicSession.email}`
  );

  if (!magicSession.conversation_id) {
    throw new Error('Invalid magic link - missing conversation context');
  }

  const hasAccess = await authRepository.verifyFinderAccessToConversation(
    magicSession.email,
    magicSession.conversation_id
  );
  if (!hasAccess) {
    throw new Error('Access denied - invalid conversation access');
  }

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiresAt = new Date(Date.now() + t.THREE_DAYS);

  logger.debug(
    `DEBUG: Creating new finder session token: ${sessionToken.substring(0, 8)}...`
  );

  await authRepository.createOwnerSession(
    magicSession.email,
    [],
    `finder_${sessionToken}`,
    sessionExpiresAt,
    magicSession.conversation_id,
    'finder'
  );

  logger.debug(
    `DEBUG: Finder session created successfully for email: ${magicSession.email}, conversation: ${magicSession.conversation_id}`
  );

  return {
    sessionToken,
    finderEmail: magicSession.email,
    conversationId: magicSession.conversation_id,
  };
}

export async function verifyFinderSession(
  token: string
): Promise<{ finderEmail: string; conversationId: string } | null> {
  const session = await authRepository.getOwnerSession(`finder_${token}`);
  if (!session || !session.conversation_id) {
    return null;
  }
  return {
    finderEmail: session.email,
    conversationId: session.conversation_id,
  };
}

export function extractEmailFromConversationAccess(
  conversationId: string,
  ownerEmail?: string
): string | null {
  logger.info(`Extracting email for conversation: ${conversationId}`);
  return ownerEmail || null;
}
