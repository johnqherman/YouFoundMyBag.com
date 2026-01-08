import crypto from 'crypto';
import type { Request } from 'express';
import { logger } from '../../infrastructure/logger/index.js';
import type {
  StartConversationRequest,
  SendReplyRequest,
  Conversation,
  ConversationMessage,
  ConversationThread,
} from '../../client/types/index.js';

export type MessageContext = 'initial' | 'follow-up' | 'response';

export interface MessageContextInfo {
  context: MessageContext;
  isFirstFromSender: boolean;
  hasRecipientReplied: boolean;
  lastSenderType: 'finder' | 'owner' | null;
}

import { getBagByShortId } from '../bags/repository.js';
import { verifyTurnstile } from '../messaging/service.js';
import {
  sendContextualFinderNotification,
  sendContextualOwnerNotification,
  sendConversationResolvedNotification,
} from '../../infrastructure/email/index.js';
import { generateMagicLink, generateFinderMagicLink } from '../auth/service.js';
import * as conversationRepository from './repository.js';
import {
  getContextualSubject,
  getContextualSenderName,
  type PersonalizationContext,
  type NameInfo,
} from '../../infrastructure/utils/personalization.js';

export function analyzeMessageContext(
  messages: ConversationMessage[],
  currentSenderType: 'finder' | 'owner'
): MessageContextInfo {
  const recipientType = currentSenderType === 'finder' ? 'owner' : 'finder';

  const senderMessages = messages.filter(
    (msg) => msg.sender_type === currentSenderType
  );
  const recipientMessages = messages.filter(
    (msg) => msg.sender_type === recipientType
  );

  const lastMessage = messages[messages.length - 1];
  const lastSenderType = lastMessage ? lastMessage.sender_type : null;

  const isFirstFromSender = senderMessages.length === 0;

  const hasRecipientReplied = recipientMessages.length > 0;

  let context: MessageContext;

  if (isFirstFromSender) {
    context = 'initial';
  } else if (lastSenderType === currentSenderType) {
    context = 'follow-up';
  } else if (hasRecipientReplied) {
    context = 'response';
  } else {
    context = 'follow-up';
  }

  return {
    context,
    isFirstFromSender,
    hasRecipientReplied,
    lastSenderType,
  };
}

async function shouldSendNotification(
  conversationId: string,
  senderType: 'finder' | 'owner'
): Promise<boolean> {
  const counters =
    await conversationRepository.getNotificationCounters(conversationId);

  const recipientCounter =
    senderType === 'finder'
      ? counters.owner_notifications_sent
      : counters.finder_notifications_sent;

  return recipientCounter < 2;
}

export function getMessageContextLabel(
  context: MessageContext,
  senderType: 'finder' | 'owner',
  viewerType: 'finder' | 'owner'
): string {
  const isOwnMessage = senderType === viewerType;

  if (context === 'initial') {
    return isOwnMessage ? 'Your initial message' : 'Initial contact';
  } else if (context === 'follow-up') {
    return isOwnMessage ? 'Your follow-up' : 'Follow-up message';
  } else {
    return isOwnMessage ? 'Your reply' : 'Reply';
  }
}

export function getNotificationSubject(
  context: MessageContext,
  senderType: 'finder' | 'owner',
  names: NameInfo
): string {
  const personalizationContext: PersonalizationContext = {
    context,
    senderType,
    recipientType: senderType === 'finder' ? 'owner' : 'finder',
  };

  return getContextualSubject(personalizationContext, names);
}

export async function startConversation(
  shortId: string,
  messageData: StartConversationRequest
): Promise<Conversation> {
  const turnstileValid = await verifyTurnstile(messageData.turnstile_token);
  if (!turnstileValid) {
    throw new Error('Please complete the security verification');
  }

  const bag = await getBagByShortId(shortId);
  if (!bag) {
    throw new Error('Bag not found');
  }

  if (bag.status !== 'active') {
    throw new Error('This bag has been deactivated by its owner');
  }

  const conversation = await conversationRepository.createConversation(
    bag.id,
    messageData.finder_message,
    messageData.finder_email,
    messageData.finder_display_name
  );

  if (bag.owner_email) {
    try {
      await generateMagicLink(
        bag.owner_email,
        conversation.id,
        [bag.id],
        bag.bag_name
      );

      await conversationRepository.incrementNotificationCounter(
        conversation.id,
        'owner'
      );

      logger.info(
        `Magic link sent to owner for bag ${shortId}, conversation ${conversation.id}`
      );
    } catch (emailError) {
      logger.error(`Failed to send magic link for bag ${shortId}:`, emailError);
    }
  } else {
    logger.info(
      `Skipped magic link for bag ${shortId} - owner opted for direct contact only`
    );
  }

  try {
    await generateFinderMagicLink(messageData.finder_email!, conversation.id);
    logger.info(
      `Finder magic link sent to ${messageData.finder_email} for conversation ${conversation.id}`
    );
  } catch (emailError) {
    logger.error(
      `Failed to send finder magic link to ${messageData.finder_email}:`,
      emailError
    );
  }

  return conversation;
}

export async function sendReply(
  conversationId: string,
  replyData: SendReplyRequest,
  senderType: 'finder' | 'owner'
): Promise<ConversationMessage> {
  const conversationThread =
    await conversationRepository.getConversationById(conversationId);
  if (!conversationThread) {
    throw new Error('Conversation not found');
  }

  if (conversationThread.conversation.status === 'resolved') {
    throw new Error('Cannot send messages in a resolved conversation');
  }

  const messageContext = analyzeMessageContext(
    conversationThread.messages,
    senderType
  );

  await conversationRepository.resetNotificationCounter(
    conversationId,
    senderType
  );

  const message = await conversationRepository.addMessage(
    conversationId,
    senderType,
    replyData.message_content
  );

  const shouldNotify = await shouldSendNotification(conversationId, senderType);

  if (shouldNotify) {
    try {
      const names: NameInfo = {
        ownerName: conversationThread.bag.owner_name,
        bagName: conversationThread.bag.bag_name,
        finderName: conversationThread.conversation.finder_display_name,
      };

      if (
        senderType === 'owner' &&
        conversationThread.conversation.finder_email
      ) {
        const senderName = getContextualSenderName(
          senderType,
          names,
          messageContext.context
        );
        await sendContextualFinderNotification({
          finderEmail: conversationThread.conversation.finder_email,
          senderName,
          message: replyData.message_content,
          conversationId,
          context: messageContext.context,
          names,
        });
      } else if (senderType === 'finder') {
        const bag = await getBagByShortId(conversationThread.bag.short_id);
        if (bag?.owner_email) {
          const senderName = getContextualSenderName(
            senderType,
            names,
            messageContext.context
          );
          await sendContextualOwnerNotification({
            ownerEmail: bag.owner_email,
            senderName,
            message: replyData.message_content,
            conversationId,
            bagIds: [bag.id],
            context: messageContext.context,
            names,
          });
        }
      }

      const recipientType = senderType === 'finder' ? 'owner' : 'finder';
      await conversationRepository.incrementNotificationCounter(
        conversationId,
        recipientType
      );

      logger.info(
        `Contextual ${messageContext.context} notification sent for conversation ${conversationId}`
      );
    } catch (emailError) {
      logger.error(
        `Failed to send ${messageContext.context} email for conversation ${conversationId}:`,
        emailError
      );
    }
  } else {
    logger.info(
      `Notification limit reached for conversation ${conversationId}, skipping email`
    );
  }

  await conversationRepository.markMessagesAsRead(conversationId, senderType);

  return message;
}

export async function getOwnerConversations(
  ownerEmail: string
): Promise<ConversationThread[]> {
  return conversationRepository.getConversationsByOwnerEmail(ownerEmail);
}

export async function getConversationThread(
  conversationId: string,
  viewerType: 'finder' | 'owner',
  viewerEmail?: string
): Promise<ConversationThread | null> {
  const thread =
    await conversationRepository.getConversationById(conversationId);
  if (!thread) return null;

  if (viewerType === 'owner') {
    const bag = await getBagByShortId(thread.bag.short_id);
    if (!bag || bag.owner_email !== viewerEmail) {
      throw new Error('Access denied');
    }
  } else if (viewerType === 'finder') {
    if (
      thread.conversation.finder_email &&
      thread.conversation.finder_email !== viewerEmail
    ) {
      throw new Error('Access denied');
    }
  }

  await conversationRepository.markMessagesAsRead(conversationId, viewerType);

  return thread;
}

export async function resolveConversation(
  conversationId: string,
  ownerEmail: string
): Promise<void> {
  const thread =
    await conversationRepository.getConversationById(conversationId);
  if (!thread) {
    throw new Error('Conversation not found');
  }

  const bag = await getBagByShortId(thread.bag.short_id);
  if (!bag || bag.owner_email !== ownerEmail) {
    throw new Error('Access denied');
  }

  await conversationRepository.updateConversationStatus(
    conversationId,
    'resolved'
  );

  if (thread.conversation.finder_email) {
    try {
      const names: NameInfo = {
        ownerName: thread.bag.owner_name,
        bagName: thread.bag.bag_name,
        finderName: thread.conversation.finder_display_name,
      };

      await sendConversationResolvedNotification({
        finderEmail: thread.conversation.finder_email,
        conversationId,
        names,
      });
      logger.info(
        `Conversation resolved notification sent to finder for conversation ${conversationId}`
      );
    } catch (emailError) {
      logger.error(
        `Failed to send conversation resolved notification for conversation ${conversationId}:`,
        emailError
      );
    }
  } else {
    logger.info(
      `Skipped conversation resolved notification for conversation ${conversationId} - no finder email`
    );
  }
}

export function getClientIpHash(
  req: Pick<Request, 'ip'> & { connection?: { remoteAddress?: string } }
): string {
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
  return crypto
    .createHash('sha256')
    .update(clientIp)
    .digest('hex')
    .substring(0, 16);
}
