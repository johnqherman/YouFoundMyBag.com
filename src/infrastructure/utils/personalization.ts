import type { MessageContext } from '../../features/conversations/service.js';

export interface PersonalizationContext {
  context: MessageContext;
  senderType: 'finder' | 'owner';
  recipientType: 'finder' | 'owner';
}

export interface NameInfo {
  ownerName?: string;
  bagName?: string;
  finderName?: string;
}

export function shouldPersonalize(context: MessageContext): boolean {
  return context !== 'initial';
}

export function getContextualSenderName(
  senderType: 'finder' | 'owner',
  names: NameInfo,
  context: MessageContext
): string {
  if (!shouldPersonalize(context)) {
    return senderType === 'finder' ? 'Someone' : 'The bag owner';
  }

  if (senderType === 'finder') {
    return names.finderName || 'The finder';
  } else {
    return names.ownerName || 'The bag owner';
  }
}

export function getContextualRecipientName(
  recipientType: 'finder' | 'owner',
  names: NameInfo,
  context: MessageContext
): string {
  if (!shouldPersonalize(context)) {
    return recipientType === 'finder' ? 'the finder' : 'the owner';
  }

  if (recipientType === 'finder') {
    return names.finderName || 'the finder';
  } else {
    return names.ownerName || 'the owner';
  }
}

export function getContextualBagReference(
  names: NameInfo,
  context: MessageContext,
  includeArticle: boolean = false,
  recipientType?: 'finder' | 'owner'
): string {
  if (!shouldPersonalize(context)) {
    return includeArticle ? 'your bag' : 'bag';
  }

  const { ownerName, bagName } = names;

  if (recipientType === 'owner') {
    if (bagName) {
      return includeArticle ? `your ${bagName}` : bagName;
    }
    return includeArticle ? 'your bag' : 'bag';
  }

  if (bagName && ownerName) {
    return `${ownerName}'s ${bagName}`;
  }

  if (bagName) {
    return includeArticle ? `your ${bagName}` : bagName;
  }

  if (ownerName) {
    return includeArticle ? `${ownerName}'s bag` : `${ownerName}'s bag`;
  }

  return includeArticle ? 'your bag' : 'bag';
}

export function getContextualSubject(
  personalizationContext: PersonalizationContext,
  names: NameInfo
): string {
  const { context, senderType } = personalizationContext;

  if (context === 'initial') {
    if (senderType === 'finder') {
      const bagType = names.bagName || 'bag';
      return `Someone found your ${bagType}!`;
    } else {
      return `The bag owner responded to you!`;
    }
  }

  const senderName = getContextualSenderName(senderType, names, context);
  const recipientType = senderType === 'finder' ? 'owner' : 'finder';
  const bagReference = getContextualBagReference(
    names,
    context,
    false,
    recipientType
  );

  if (context === 'follow-up') {
    return senderType === 'finder'
      ? `${senderName} sent another message about your ${bagReference}`
      : `${senderName} sent you another message`;
  }

  return `${senderName} replied to your message!`;
}

export function getContextualGreeting(
  personalizationContext: PersonalizationContext,
  names: NameInfo
): string {
  const { context, senderType } = personalizationContext;

  if (context === 'initial') {
    if (senderType === 'finder') {
      const bagType = names.bagName || 'bag';
      return `🎒 Someone found your ${bagType}!`;
    } else {
      return `📬 The bag owner responded!`;
    }
  }

  const senderName = getContextualSenderName(senderType, names, context);

  if (context === 'follow-up') {
    return senderType === 'finder'
      ? `📬 ${senderName} sent you another message!`
      : `📬 ${senderName} sent you another message!`;
  }

  return `📬 ${senderName} replied to your message!`;
}

export function getContextualDescription(
  personalizationContext: PersonalizationContext,
  names: NameInfo
): string {
  const { context, senderType } = personalizationContext;

  if (context === 'initial') {
    if (senderType === 'finder') {
      const bagType = names.bagName || 'bag';
      return `Great news! Someone found your ${bagType} and wants to return it. Click the secure link below to respond to the finder.`;
    } else {
      return 'The bag owner responded to your message. Click the secure link below to continue the conversation and arrange the bag return.';
    }
  }

  const senderName = getContextualSenderName(senderType, names, context);

  if (context === 'follow-up') {
    const bagType = names.bagName || 'bag';
    return senderType === 'finder'
      ? `${senderName} sent you another message about your ${bagType}. Click the secure link below to view the message and respond.`
      : `${senderName} sent you a follow-up message. Click the secure link below to continue the conversation.`;
  }

  return `${senderName} replied to your message. Click the secure link below to continue the conversation.`;
}

export function getContextualReplyPlaceholder(
  recipientType: 'finder' | 'owner',
  names: NameInfo,
  context: MessageContext
): string {
  const recipientName = getContextualRecipientName(
    recipientType,
    names,
    context
  );
  return `Type your reply to ${recipientName}...`;
}

export function formatConversationParticipant(
  participantType: 'finder' | 'owner',
  names: NameInfo,
  isCurrentUser: boolean = false
): string {
  if (isCurrentUser) {
    return 'You';
  }

  if (participantType === 'finder') {
    return names.finderName || 'Finder';
  } else {
    return names.ownerName || 'Owner';
  }
}
