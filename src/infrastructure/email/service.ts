import { logger } from '../logger/index.js';
import { config } from '../config/index.js';
import { sendMail, getMailgunClient } from './mailgun.js';
import { getDashboardUrl, getEmailFooter } from './utils.js';
import {
  buildMagicLinkEmail,
  buildNotificationEmail,
  buildConversationResolvedEmail,
  buildBagCreatedEmail,
  buildReissueEmail,
  buildSystemUpdateEmail,
  buildBillingAlertEmail,
} from './templates.js';
import { secureEmailContent } from '../security/sanitization.js';
import { lowercaseBagName } from '../utils/formatting.js';
import { shouldSendEmail } from '../../features/email-preferences/service.js';
import {
  generateMagicLinkToken,
  generateFinderMagicLinkToken,
} from '../../features/auth/service.js';
import {
  getContextualSubject,
  getContextualGreeting,
  getContextualDescription,
} from '../utils/personalization.js';
import {
  PersonalizationContext,
  MagicLinkParams,
  NotificationParams,
  ConversationResolvedParams,
  BagCreatedParams,
  ReissueParams,
  EmailJobData,
} from '../types/index.js';
import { addEmailJob } from '../queue/index.js';

function generateIdempotencyKey(
  type: string,
  ...parts: (string | undefined)[]
): string {
  const filteredParts = parts.filter((p) => p !== undefined);
  return `email_${type}_${filteredParts.join('_')}`;
}

async function sendDirectEmail(
  to: string,
  subject: string,
  html: string,
  description: string
): Promise<void> {
  if (!getMailgunClient()) {
    logger.info(`Email not configured - ${description} not sent`);
    return;
  }

  try {
    await sendMail({ to, subject, html });
  } catch (error) {
    logger.error(`${description} failed:`, error);
    throw error;
  }
}

async function queueEmail(
  type: string,
  to: string,
  subject: string,
  html: string,
  idempotencyKey: string,
  conversationId?: string
): Promise<void> {
  const emailData: EmailJobData = {
    type: type as EmailJobData['type'],
    to,
    subject,
    html,
    idempotencyKey,
    conversationId,
  };

  await addEmailJob(emailData);
  logger.info(`${type} email queued`, { to, conversationId });
}

export async function sendMagicLink(
  params: MagicLinkParams,
  useQueue = false
): Promise<void> {
  const dashboardUrl = getDashboardUrl();
  const { email, magicLinkToken, conversationId, userType } = params;

  let magicLinkUrl: string;
  let greeting: string;
  let description: string;
  let buttonText: string;
  let footerText: string | undefined;

  if (userType === 'owner') {
    magicLinkUrl = `${dashboardUrl}/auth/verify?token=${magicLinkToken}${
      conversationId ? `&conversation=${conversationId}` : ''
    }`;

    const bagType = lowercaseBagName(params.bagName);

    if (conversationId) {
      greeting = `🎒 Someone found your ${bagType}!`;
      description = `Great news! Someone found your ${bagType} and wants to return it. Click the secure link below to respond to the finder.`;
      buttonText = 'Respond to Finder';
    } else {
      greeting = '🔐 Access your dashboard';
      description =
        'Click the secure link below to view all your bags and manage any messages from finders.';
      buttonText = 'Access Dashboard';
    }

    footerText =
      "If you didn't request this access, you can safely ignore this email.";
  } else {
    magicLinkUrl = `${dashboardUrl}/finder/conversation/${conversationId}?token=${magicLinkToken}`;
    greeting = '✅ Your message was sent!';
    description =
      'Your message has been delivered to the bag owner. Click the secure link below to continue the conversation and arrange the return.';
    buttonText = 'Continue Conversation';
  }

  const { htmlFooter } = await getEmailFooter(email);
  const preferencesUrl = htmlFooter.match(/href="([^"]+)"/)?.[1] || '';

  const subject =
    userType === 'owner'
      ? conversationId
        ? `Someone found your ${lowercaseBagName(params.bagName)}! Click to respond`
        : 'Access your dashboard'
      : 'Your message was sent! Continue the conversation';

  const html = buildMagicLinkEmail({
    magicLinkUrl,
    greeting,
    description,
    buttonText,
    footerText,
    preferencesUrl,
  });

  if (useQueue) {
    const idempotencyKey = generateIdempotencyKey(
      `magic_link_${userType}`,
      email,
      conversationId,
      magicLinkToken
    );
    await queueEmail(
      `magic_link_${userType}`,
      email,
      subject,
      html,
      idempotencyKey,
      conversationId
    );
  } else {
    await sendDirectEmail(email, subject, html, `${userType} magic link email`);
  }
}

export async function sendContextualNotification(
  params: NotificationParams,
  useQueue = false
): Promise<void> {
  const { senderName, message, conversationId, userType, context, names } =
    params;
  const email = userType === 'owner' ? params.ownerEmail : params.finderEmail;

  const canSend = await shouldSendEmail(email, 'conversation_notification');
  if (!canSend) {
    logger.info(
      `Skipping conversation notification to ${email} - user has disabled this notification`
    );
    return;
  }

  const { magicLinkToken } =
    userType === 'owner'
      ? await generateMagicLinkToken(email, conversationId, params.bagIds)
      : await generateFinderMagicLinkToken(email, conversationId);

  const dashboardUrl = getDashboardUrl();
  const continueUrl =
    userType === 'owner'
      ? `${dashboardUrl}/auth/verify?token=${magicLinkToken}&conversation=${conversationId}`
      : `${dashboardUrl}/finder/conversation/${conversationId}?token=${magicLinkToken}`;

  const personalizationContext: PersonalizationContext = {
    context,
    senderType: userType === 'owner' ? 'finder' : 'owner',
    recipientType: userType,
  };

  const subject = getContextualSubject(personalizationContext, names);
  const greeting = getContextualGreeting(personalizationContext, names);
  const description = getContextualDescription(personalizationContext, names);

  const { htmlFooter } = await getEmailFooter(email);
  const preferencesUrl = htmlFooter.match(/href="([^"]+)"/)?.[1] || '';

  const html = buildNotificationEmail({
    greeting,
    description,
    senderName,
    message,
    continueUrl,
    buttonText: 'Continue Conversation',
    preferencesUrl,
  });

  if (useQueue) {
    const idempotencyKey = generateIdempotencyKey(
      `${userType}_notification`,
      email,
      conversationId,
      context
    );
    await queueEmail(
      'new_message_notification',
      email,
      subject,
      html,
      idempotencyKey,
      conversationId
    );
  } else {
    await sendDirectEmail(
      email,
      subject,
      html,
      `contextual ${userType} notification`
    );
  }
}

export async function sendConversationResolved(
  params: ConversationResolvedParams,
  useQueue = false
): Promise<void> {
  const { finderEmail, conversationId, names } = params;

  const canSend = await shouldSendEmail(
    finderEmail,
    'conversation_notification'
  );
  if (!canSend) {
    logger.info(
      `Skipping conversation resolved notification to ${finderEmail} - user has disabled this notification`
    );
    return;
  }

  const { magicLinkToken } = await generateFinderMagicLinkToken(
    finderEmail,
    conversationId
  );

  const dashboardUrl = getDashboardUrl();
  const continueUrl = `${dashboardUrl}/finder/conversation/${conversationId}?token=${magicLinkToken}`;

  const lowercasedBagName = lowercaseBagName(names.bagName);
  const { content: safeBagName } = secureEmailContent(lowercasedBagName);
  const { content: safeOwnerName } = secureEmailContent(names.ownerName || '');

  const bagDisplayName = names.bagName
    ? names.ownerName
      ? `${safeOwnerName}'s ${safeBagName}`
      : safeBagName
    : names.ownerName
      ? `${safeOwnerName}'s bag`
      : 'the bag';

  const hasSpecificName = names.bagName || names.ownerName;
  const htmlBagDisplayName = hasSpecificName
    ? `<strong>${bagDisplayName}</strong>`
    : bagDisplayName;

  const subject = `Conversation about ${bagDisplayName} has been resolved`;

  const { htmlFooter } = await getEmailFooter(finderEmail);
  const preferencesUrl = htmlFooter.match(/href="([^"]+)"/)?.[1] || '';

  const html = buildConversationResolvedEmail({
    bagDisplayName,
    htmlBagDisplayName,
    continueUrl,
    preferencesUrl,
  });

  if (useQueue) {
    const idempotencyKey = generateIdempotencyKey(
      'conversation_resolved',
      finderEmail,
      conversationId
    );
    await queueEmail(
      'new_message_notification',
      finderEmail,
      subject,
      html,
      idempotencyKey,
      conversationId
    );
  } else {
    await sendDirectEmail(
      finderEmail,
      subject,
      html,
      'conversation resolved notification'
    );
  }
}

export async function sendBagCreated(params: BagCreatedParams): Promise<void> {
  const { email, bagName, shortId, bagUrl } = params;

  const canSend = await shouldSendEmail(email, 'bag_created');
  if (!canSend) {
    logger.info(
      `Skipping bag created email to ${email} - user has disabled this notification`
    );
    return;
  }

  const { magicLinkToken } = await generateMagicLinkToken(email);

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/auth/verify?token=${magicLinkToken}`;

  const bagType = lowercaseBagName(bagName);
  const { content: safeBagType } = secureEmailContent(bagType);
  const yourBag = bagName ? `your ${safeBagType}` : 'your bag';

  const subject = `Your ${bagType} tag is ready! Access your dashboard`;

  const { htmlFooter } = await getEmailFooter(email);
  const preferencesUrl = htmlFooter.match(/href="([^"]+)"/)?.[1] || '';

  const html = buildBagCreatedEmail({
    bagType,
    shortId,
    bagUrl,
    yourBag,
    magicLinkUrl,
    preferencesUrl,
  });

  const idempotencyKey = generateIdempotencyKey('bag_created', email, shortId);
  await queueEmail('bag_created', email, subject, html, idempotencyKey);
}

export async function sendSystemUpdateEmail(
  email: string,
  params: {
    title: string;
    bodyHtml: string;
    ctaUrl?: string;
    ctaText?: string;
    subject: string;
  }
): Promise<void> {
  const canSend = await shouldSendEmail(email, 'system_update');
  if (!canSend) {
    logger.info(
      `Skipping system update email to ${email} - user has disabled this notification`
    );
    return;
  }

  const { htmlFooter } = await getEmailFooter(email);
  const preferencesUrl = htmlFooter.match(/href="([^"]+)"/)?.[1] || '';

  const html = buildSystemUpdateEmail({
    title: params.title,
    bodyHtml: params.bodyHtml,
    ctaUrl: params.ctaUrl,
    ctaText: params.ctaText,
    preferencesUrl,
  });

  const idempotencyKey = generateIdempotencyKey(
    'system_update',
    email,
    params.subject
  );
  await queueEmail(
    'system_update',
    email,
    params.subject,
    html,
    idempotencyKey
  );
}

export async function sendBillingAlertEmail(
  email: string,
  params: {
    title: string;
    bodyHtml: string;
    ctaUrl?: string;
    ctaText?: string;
    subject: string;
  }
): Promise<void> {
  const canSend = await shouldSendEmail(email, 'system_update');
  if (!canSend) {
    logger.info(
      `Skipping billing alert email to ${email} - user has disabled this notification`
    );
    return;
  }

  const { htmlFooter } = await getEmailFooter(email);
  const preferencesUrl = htmlFooter.match(/href="([^"]+)"/)?.[1] || '';

  const html = buildBillingAlertEmail({
    title: params.title,
    bodyHtml: params.bodyHtml,
    ctaUrl: params.ctaUrl,
    ctaText: params.ctaText,
    preferencesUrl,
  });

  const idempotencyKey = generateIdempotencyKey(
    'billing_alert',
    email,
    String(Date.now())
  );
  await queueEmail(
    'billing_alert',
    email,
    params.subject,
    html,
    idempotencyKey
  );
}

export async function sendMagicLinkReissue(
  params: ReissueParams
): Promise<void> {
  const { userType, email, magicLinkToken, conversationId } = params;

  let magicLink: string;
  let title: string;
  let description: string;
  let buttonText: string;

  if (userType === 'owner') {
    magicLink = `${config.FRONTEND_URL}/auth/verify?token=${magicLinkToken}`;
    title = '🔑 Your New Access Link';
    description =
      "We've generated a new link for you to access your bags and conversations on YouFoundMyBag.com.";
    buttonText = 'Access Your Dashboard';
  } else {
    magicLink = `${config.FRONTEND_URL}/finder/conversation/${conversationId}?token=${magicLinkToken}`;
    title = '🔑 Your New Conversation Link';
    description =
      "We've generated a new link for you to continue your conversation on YouFoundMyBag.com.";
    buttonText = 'Continue Conversation';
  }

  const subject =
    userType === 'owner'
      ? 'Your new access link for YouFoundMyBag.com'
      : 'Your new conversation link for YouFoundMyBag.com';

  const { htmlFooter } = await getEmailFooter(email);
  const preferencesUrl = htmlFooter.match(/href="([^"]+)"/)?.[1] || '';

  const html = buildReissueEmail({
    title,
    description,
    magicLinkUrl: magicLink,
    buttonText,
    expiryDays: '30d',
    preferencesUrl,
  });

  const idempotencyKey = generateIdempotencyKey(
    'magic_link_reissue',
    userType,
    email,
    magicLinkToken
  );
  await queueEmail(
    'magic_link_reissue',
    email,
    subject,
    html,
    idempotencyKey,
    conversationId
  );
}
