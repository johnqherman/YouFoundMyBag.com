import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import {
  generateMagicLinkToken,
  generateFinderMagicLinkToken,
} from '../../features/auth/service.js';
import { secureEmailContent } from '../security/sanitization.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter && config.SMTP_HOST) {
    const needsAuth = config.SMTP_HOST !== 'localhost';

    if (!needsAuth || (config.SMTP_USER && config.SMTP_PASS)) {
      transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: false,
        auth: needsAuth
          ? {
              user: config.SMTP_USER,
              pass: config.SMTP_PASS,
            }
          : undefined,
      });
    }
  }
  return transporter;
}

function getDashboardUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}

export async function sendReplyEmail({
  recipientEmail,
  senderType,
  senderName,
  message,
  conversationId,
  bagShortId,
}: {
  recipientEmail: string;
  senderType: 'finder' | 'owner';
  senderName: string;
  message: string;
  conversationId: string;
  bagShortId: string;
}): Promise<void> {
  const emailer = getTransporter();
  if (!emailer) {
    console.log('Email not configured - reply email not sent');
    return;
  }

  const { content: safeMessage } = secureEmailContent(message);
  const { content: safeSenderName } = secureEmailContent(senderName);

  const dashboardUrl = getDashboardUrl();
  const isFromOwner = senderType === 'owner';
  const subject = isFromOwner
    ? `The bag owner responded to you!`
    : `New message about your bag (${bagShortId})`;

  const continueUrl = isFromOwner
    ? `${dashboardUrl}/finder/${bagShortId}?conversation=${conversationId}`
    : `${dashboardUrl}/dashboard/conversation/${conversationId}`;

  const textBody = `
${isFromOwner ? '📬 The bag owner responded to you!' : '💬 New message about your bag'}

${safeSenderName} wrote:
"${safeMessage}"

To continue the conversation, click here:
${continueUrl}

This message was sent through YouFoundMyBag.com's secure messaging system.
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; font-size: 24px;">
          ${isFromOwner ? '📬 The bag owner responded!' : '💬 New message about your bag'}
        </h1>
      </div>

      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #374151;">${safeSenderName} wrote:</h3>
        <p style="color: #4b5563; margin: 0; white-space: pre-line;">"${safeMessage}"</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${continueUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        This message was sent through YouFoundMyBag.com's secure messaging system.
      </p>
    </div>
  `;

  try {
    await emailer.sendMail({
      from: config.SMTP_FROM,
      to: recipientEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`Reply email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Reply email failed to ${recipientEmail}:`, error);
    throw error;
  }
}

export async function sendMagicLinkEmail({
  email,
  magicLinkToken,
  conversationId,
  bagIds: _bagIds,
}: {
  email: string;
  magicLinkToken: string;
  conversationId?: string;
  bagIds?: string[];
}): Promise<void> {
  const emailer = getTransporter();
  if (!emailer) {
    console.log('Email not configured - magic link email not sent');
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/auth/verify?token=${magicLinkToken}${
    conversationId ? `&conversation=${conversationId}` : ''
  }`;

  console.log(
    `DEBUG: Generated owner magic link URL: ${magicLinkUrl.substring(0, 80)}...`
  );

  const subject = conversationId
    ? 'Someone found your bag! Click to respond'
    : 'Access your YouFoundMyBag dashboard';

  const textBody = `
${conversationId ? '🎒 Great news! Someone found your bag and wants to return it.' : 'Access your YouFoundMyBag dashboard'}

Click this secure link to ${conversationId ? 'respond to the finder' : 'access your dashboard'}:
${magicLinkUrl}

This link will expire in 24 hours.

${conversationId ? 'You can securely communicate with the finder to arrange the return of your bag.' : 'You can view all your bags and manage any messages from finders.'}

If you didn't request this access, you can safely ignore this email.

YouFoundMyBag.com - Privacy-first lost item recovery
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; font-size: 24px;">
          ${conversationId ? '🎒 Someone found your bag!' : '🔐 Access your dashboard'}
        </h1>
      </div>

      <p style="color: #4b5563; margin-bottom: 20px;">
        ${
          conversationId
            ? 'Great news! Someone found your bag and wants to return it. Click the secure link below to respond to the finder.'
            : 'Click the secure link below to view all your bags and manage any messages from finders.'
        }
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          ${conversationId ? 'Respond to Finder' : 'Access Dashboard'}
        </a>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        If you didn't request this access, you can safely ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        YouFoundMyBag.com - Privacy-first lost item recovery
      </p>
    </div>
  `;

  try {
    await emailer.sendMail({
      from: config.SMTP_FROM,
      to: email,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`Magic link email sent to ${email}`);
  } catch (error) {
    console.error(`Magic link email failed to ${email}:`, error);
    throw error;
  }
}

export async function sendFinderMagicLinkEmail({
  email,
  magicLinkToken,
  conversationId,
}: {
  email: string;
  magicLinkToken: string;
  conversationId: string;
}): Promise<void> {
  const emailer = getTransporter();
  if (!emailer) {
    console.log('Email not configured - finder magic link email not sent');
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/finder/conversation/${conversationId}?token=${magicLinkToken}`;

  console.log(
    `DEBUG: Generated finder magic link URL: ${magicLinkUrl.substring(0, 80)}...`
  );

  const subject = 'Your message was sent! Continue the conversation';

  const textBody = `
✅ Your message was sent to the bag owner!

Click this secure link to continue the conversation:
${magicLinkUrl}

This link will expire in 24 hours.

You can communicate securely with the owner to arrange the bag return.

YouFoundMyBag.com - Privacy-first lost item recovery
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; font-size: 24px;">
          ✅ Your message was sent!
        </h1>
      </div>

      <p style="color: #4b5563; margin-bottom: 20px;">
        Your message has been delivered to the bag owner. Click the secure link below to continue the conversation and arrange the return.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Save this email to easily access the conversation later.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        YouFoundMyBag.com - Privacy-first lost item recovery
      </p>
    </div>
  `;

  try {
    await emailer.sendMail({
      from: config.SMTP_FROM,
      to: email,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`Finder magic link email sent to ${email}`);
  } catch (error) {
    console.error(`Finder magic link email failed to ${email}:`, error);
    throw error;
  }
}

export async function sendFinderReplyNotification({
  finderEmail,
  senderName,
  message,
  conversationId,
}: {
  finderEmail: string;
  senderName: string;
  message: string;
  conversationId: string;
}): Promise<void> {
  const { magicLinkToken } = await generateFinderMagicLinkToken(
    finderEmail,
    conversationId
  );

  const emailer = getTransporter();
  if (!emailer) {
    console.log('Email not configured - finder reply notification not sent');
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/finder/conversation/${conversationId}?token=${magicLinkToken}`;

  const { content: safeSenderName } = secureEmailContent(senderName);
  const { content: safeMessage } = secureEmailContent(message);

  const subject = `${safeSenderName} responded to you!`;

  const textBody = `
📬 ${safeSenderName} responded to you!

${safeSenderName} wrote:
"${safeMessage}"

Click this secure link to continue the conversation:
${magicLinkUrl}

This link will expire in 24 hours.

YouFoundMyBag.com - Privacy-first lost item recovery
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; font-size: 24px;">
          📬 ${safeSenderName} responded!
        </h1>
      </div>

      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #374151;">${safeSenderName} wrote:</h3>
        <p style="color: #4b5563; margin: 0; white-space: pre-line;">"${safeMessage}"</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        YouFoundMyBag.com - Privacy-first lost item recovery
      </p>
    </div>
  `;

  try {
    await emailer.sendMail({
      from: config.SMTP_FROM,
      to: finderEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`Finder reply notification sent to ${finderEmail}`);
  } catch (error) {
    console.error(`Finder reply notification failed to ${finderEmail}:`, error);
    throw error;
  }
}

export async function sendOwnerReplyNotification({
  ownerEmail,
  senderName,
  message,
  conversationId,
  bagIds,
}: {
  ownerEmail: string;
  senderName: string;
  message: string;
  conversationId: string;
  bagIds: string[];
}): Promise<void> {
  const { magicLinkToken } = await generateMagicLinkToken(
    ownerEmail,
    conversationId,
    bagIds
  );

  const emailer = getTransporter();
  if (!emailer) {
    console.log('Email not configured - owner reply notification not sent');
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/auth/verify?token=${magicLinkToken}&conversation=${conversationId}`;

  const { content: safeSenderName } = secureEmailContent(senderName);
  const { content: safeMessage } = secureEmailContent(message);

  const subject = `${safeSenderName} responded to you!`;

  const textBody = `
💬 ${safeSenderName} responded to you!

${safeSenderName} wrote:
"${safeMessage}"

Click this secure link to continue the conversation:
${magicLinkUrl}

This link will expire in 24 hours.

YouFoundMyBag.com - Privacy-first lost item recovery
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; font-size: 24px;">
          💬 ${safeSenderName} responded!
        </h1>
      </div>

      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #374151;">${safeSenderName} wrote:</h3>
        <p style="color: #4b5563; margin: 0; white-space: pre-line;">"${safeMessage}"</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        YouFoundMyBag.com - Privacy-first lost item recovery
      </p>
    </div>
  `;

  try {
    await emailer.sendMail({
      from: config.SMTP_FROM,
      to: ownerEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`Owner reply notification sent to ${ownerEmail}`);
  } catch (error) {
    console.error(`Owner reply notification failed to ${ownerEmail}:`, error);
    throw error;
  }
}

import type { MessageContext } from '../../features/conversations/service.js';
import {
  getContextualSubject,
  getContextualGreeting,
  getContextualDescription,
  type PersonalizationContext,
  type NameInfo,
} from '../utils/personalization.js';

export async function sendContextualFinderNotification({
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
  const { magicLinkToken } = await generateFinderMagicLinkToken(
    finderEmail,
    conversationId
  );

  const emailer = getTransporter();
  if (!emailer) {
    console.log(
      'Email not configured - finder contextual notification not sent'
    );
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/finder/conversation/${conversationId}?token=${magicLinkToken}`;

  console.log(
    `DEBUG: Generated contextual finder notification URL: ${magicLinkUrl.substring(0, 80)}...`
  );

  const { content: safeMessage } = secureEmailContent(message);
  const { content: safeSenderName } = secureEmailContent(senderName);

  const personalizationContext: PersonalizationContext = {
    context,
    senderType: 'owner',
    recipientType: 'finder',
  };

  const subject = getContextualSubject(personalizationContext, names);
  const greeting = getContextualGreeting(personalizationContext, names);
  const contextDescription = getContextualDescription(
    personalizationContext,
    names
  );

  const textBody = `
${greeting}

${safeSenderName} wrote:
"${safeMessage}"

Click this secure link to continue the conversation:
${magicLinkUrl}

This link will expire in 24 hours.

YouFoundMyBag.com - Privacy-first lost item recovery
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; font-size: 24px;">
          ${greeting}
        </h1>
      </div>

      <p style="color: #4b5563; margin-bottom: 20px;">
        ${contextDescription}
      </p>

      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #374151;">${safeSenderName} wrote:</h3>
        <p style="color: #4b5563; margin: 0; white-space: pre-line;">"${safeMessage}"</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        YouFoundMyBag.com - Privacy-first lost item recovery
      </p>
    </div>
  `;

  try {
    await emailer.sendMail({
      from: config.SMTP_FROM,
      to: finderEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(
      `Contextual ${context} notification sent to finder ${finderEmail}`
    );
  } catch (error) {
    console.error(
      `Contextual finder notification failed to ${finderEmail}:`,
      error
    );
    throw error;
  }
}

export async function sendContextualOwnerNotification({
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
  const { magicLinkToken } = await generateMagicLinkToken(
    ownerEmail,
    conversationId,
    bagIds
  );

  const emailer = getTransporter();
  if (!emailer) {
    console.log(
      'Email not configured - owner contextual notification not sent'
    );
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/auth/verify?token=${magicLinkToken}&conversation=${conversationId}`;

  const { content: safeMessage } = secureEmailContent(message);
  const { content: safeSenderName } = secureEmailContent(senderName);

  const personalizationContext: PersonalizationContext = {
    context,
    senderType: 'finder',
    recipientType: 'owner',
  };

  const subject = getContextualSubject(personalizationContext, names);
  const greeting = getContextualGreeting(personalizationContext, names);
  const contextDescription = getContextualDescription(
    personalizationContext,
    names
  );

  const textBody = `
${greeting}

${safeSenderName} wrote:
"${safeMessage}"

Click this secure link to continue the conversation:
${magicLinkUrl}

This link will expire in 24 hours.

YouFoundMyBag.com - Privacy-first lost item recovery
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; font-size: 24px;">
          ${greeting}
        </h1>
      </div>

      <p style="color: #4b5563; margin-bottom: 20px;">
        ${contextDescription}
      </p>

      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #374151;">${safeSenderName} wrote:</h3>
        <p style="color: #4b5563; margin: 0; white-space: pre-line;">"${safeMessage}"</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        YouFoundMyBag.com - Privacy-first lost item recovery
      </p>
    </div>
  `;

  try {
    await emailer.sendMail({
      from: config.SMTP_FROM,
      to: ownerEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(
      `Contextual ${context} notification sent to owner ${ownerEmail}`
    );
  } catch (error) {
    console.error(
      `Contextual owner notification failed to ${ownerEmail}:`,
      error
    );
    throw error;
  }
}

export async function sendConversationResolvedNotification({
  finderEmail,
  conversationId,
  names,
}: {
  finderEmail: string;
  conversationId: string;
  names: NameInfo;
}): Promise<void> {
  const { magicLinkToken } = await generateFinderMagicLinkToken(
    finderEmail,
    conversationId
  );

  const emailer = getTransporter();
  if (!emailer) {
    console.log(
      'Email not configured - conversation resolved notification not sent'
    );
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/finder/conversation/${conversationId}?token=${magicLinkToken}`;

  const { content: safeBagName } = secureEmailContent(names.bagName || '');
  const { content: safeOwnerName } = secureEmailContent(names.ownerName || '');

  const bagDisplayName = names.bagName
    ? names.ownerName
      ? `${safeOwnerName}'s ${safeBagName}`
      : safeBagName
    : names.ownerName
      ? `${safeOwnerName}'s bag`
      : 'the bag';

  const subject = `Conversation about ${bagDisplayName} has been resolved`;

  const textBody = `
✅ Good news! The conversation about ${bagDisplayName} has been marked as resolved.

The bag owner has indicated that this matter has been successfully completed.

You can still view the full conversation history by clicking this secure link:
${magicLinkUrl}

This link will expire in 24 hours.

Thank you for using YouFoundMyBag.com to help reunite lost items with their owners!

YouFoundMyBag.com - Privacy-first lost item recovery
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; font-size: 24px;">
          ✅ Conversation Resolved!
        </h1>
      </div>

      <p style="color: #4b5563; margin-bottom: 20px;">
        Good news! The conversation about <strong>${bagDisplayName}</strong> has been marked as resolved by the bag owner.
      </p>

      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #047857; font-size: 14px;">
          🎉 <strong>Success:</strong> This matter has been successfully completed.
        </p>
      </div>

      <p style="color: #4b5563; margin-bottom: 20px;">
        You can still view the full conversation history if needed:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          View Conversation
        </a>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>

      <p style="color: #4b5563; text-align: center; margin: 30px 0;">
        Thank you for using YouFoundMyBag.com to help reunite lost items with their owners!
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        YouFoundMyBag.com - Privacy-first lost item recovery
      </p>
    </div>
  `;

  try {
    await emailer.sendMail({
      from: config.SMTP_FROM,
      to: finderEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(
      `Conversation resolved notification sent to finder ${finderEmail}`
    );
  } catch (error) {
    console.error(
      `Conversation resolved notification failed to ${finderEmail}:`,
      error
    );
    throw error;
  }
}
