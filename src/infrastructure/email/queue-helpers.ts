import {
  sendMagicLink,
  sendContextualNotification,
  sendConversationResolved,
} from './service.js';
import type { MessageContext } from '../../features/conversations/service.js';
import type { NameInfo } from '../utils/personalization.js';

export async function queueMagicLinkEmail({
  email,
  magicLinkToken,
  conversationId,
  bagIds,
  bagName,
}: {
  email: string;
  magicLinkToken: string;
  conversationId?: string;
  bagIds?: string[];
  bagName?: string;
}): Promise<void> {
  return sendMagicLink(
    {
      userType: 'owner',
      email,
      magicLinkToken,
      conversationId,
      bagIds,
      bagName,
    },
    true
  );
}

export async function queueFinderMagicLinkEmail({
  email,
  magicLinkToken,
  conversationId,
}: {
  email: string;
  magicLinkToken: string;
  conversationId: string;
}): Promise<void> {
  return sendMagicLink(
    {
      userType: 'finder',
      email,
      magicLinkToken,
      conversationId,
    },
    true
  );
}

export async function queueContextualOwnerNotification({
  ownerEmail,
  senderName,
  message,
  conversationId,
  bagIds,
  context,
  names,
}: {
  ownerEmail: string;
  senderName: string;
  message: string;
  conversationId: string;
  bagIds: string[];
  context: MessageContext;
  names: NameInfo;
}): Promise<void> {
  return sendContextualNotification(
    {
      userType: 'owner',
      ownerEmail,
      senderName,
      message,
      conversationId,
      bagIds,
      context,
      names,
    },
    true
  );
}

export async function queueContextualFinderNotification({
  finderEmail,
  senderName,
  message,
  conversationId,
  context,
  names,
}: {
  finderEmail: string;
  senderName: string;
  message: string;
  conversationId: string;
  context: MessageContext;
  names: NameInfo;
}): Promise<void> {
  return sendContextualNotification(
    {
      userType: 'finder',
      finderEmail,
      senderName,
      message,
      conversationId,
      context,
      names,
    },
    true
  );
}

export async function queueConversationResolvedNotification({
  finderEmail,
  conversationId,
  names,
}: {
  finderEmail: string;
  conversationId: string;
  names: NameInfo;
}): Promise<void> {
  return sendConversationResolved(
    {
      finderEmail,
      conversationId,
      names,
    },
    true
  );
}
