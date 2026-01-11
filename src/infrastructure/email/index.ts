import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';
import {
  generateMagicLinkToken,
  generateFinderMagicLinkToken,
} from '../../features/auth/service.js';
import { secureEmailContent } from '../security/sanitization.js';
import { lowercaseBagName } from '../utils/formatting.js';
import {
  getUnsubscribeToken,
  shouldSendEmail,
} from '../../features/email-preferences/service.js';

interface SMTPTLSConfig {
  rejectUnauthorized?: boolean;
  minVersion?: string;
}

interface SMTPTransportConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user?: string;
    pass?: string;
  };
  requireTLS?: boolean;
  tls?: SMTPTLSConfig;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter && config.SMTP_HOST) {
    const needsAuth = config.SMTP_HOST !== 'localhost';
    const isSecure =
      config.NODE_ENV === 'development' ? false : config.SMTP_SECURE;

    if (!needsAuth || (config.SMTP_USER && config.SMTP_PASS)) {
      const transportConfig: SMTPTransportConfig = {
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: isSecure,
      };

      if (needsAuth) {
        transportConfig.auth = {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        };
      }

      if (config.NODE_ENV !== 'development') {
        if (!config.SMTP_SECURE && config.SMTP_REQUIRE_TLS) {
          transportConfig.requireTLS = true;
          transportConfig.tls = {
            rejectUnauthorized: config.SMTP_REJECT_UNAUTHORIZED,
            minVersion: 'TLSv1.2',
          };
        } else if (config.SMTP_SECURE) {
          transportConfig.tls = {
            rejectUnauthorized: config.SMTP_REJECT_UNAUTHORIZED,
            minVersion: 'TLSv1.2',
          };
        }
      }

      transporter = nodemailer.createTransport(
        transportConfig as nodemailer.TransportOptions
      );

      if (config.NODE_ENV === 'development') {
        logger.debug(
          `SMTP configured: ${config.SMTP_HOST}:${config.SMTP_PORT}, secure=${config.SMTP_SECURE}, requireTLS=${config.SMTP_REQUIRE_TLS}`
        );
      }
    }
  }
  return transporter;
}

function getDashboardUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}

async function getEmailFooter(email: string): Promise<{
  textFooter: string;
  htmlFooter: string;
}> {
  const unsubscribeToken = await getUnsubscribeToken(email);
  const dashboardUrl = getDashboardUrl();
  const preferencesUrl = `${dashboardUrl}/email-preferences/${unsubscribeToken}`;

  const textFooter = `

---
YouFoundMyBag.com - Privacy-first lost item recovery

Manage your email preferences: ${preferencesUrl}`;

  const htmlFooter = `
      <hr style="border: none; border-top: 1px solid #b4cae4; margin: 30px 0;">

      <p style="color: #6894ca; font-size: 12px; text-align: center; margin-bottom: 8px;">
        YouFoundMyBag.com - Privacy-first lost item recovery
      </p>

      <p style="color: #6894ca; font-size: 12px; text-align: center;">
        <a href="${preferencesUrl}" style="color: #6894ca; text-decoration: underline;">Manage your email preferences</a>
      </p>`;

  return { textFooter, htmlFooter };
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
    logger.info('Email not configured - reply email not sent');
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

  const { textFooter, htmlFooter } = await getEmailFooter(recipientEmail);

  const textBody = `
${isFromOwner ? '📬 The bag owner responded to you!' : '💬 New message about your bag'}

${safeSenderName} wrote:
"${safeMessage}"

To continue the conversation, click here:
${continueUrl}

This message was sent through YouFoundMyBag.com's secure messaging system.${textFooter}
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #356197; font-size: 24px;">
          ${isFromOwner ? '📬 The bag owner responded!' : '💬 New message about your bag'}
        </h1>
      </div>

      <div style="background-color: #ecf2f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #1b314b;">${safeSenderName} wrote:</h3>
        <p style="color: #284971; margin: 0; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;">"${safeMessage}"</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${continueUrl}"
           style="background-color: #356197; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #b4cae4; margin: 30px 0;">

      <p style="color: #6894ca; font-size: 12px; text-align: center;">
        This message was sent through YouFoundMyBag.com's secure messaging system.
      </p>
${htmlFooter}
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
    logger.info(`Reply email sent to ${recipientEmail}`);
  } catch (error) {
    logger.error(`Reply email failed to ${recipientEmail}:`, error);
    throw error;
  }
}

export async function sendMagicLinkEmail({
  email,
  magicLinkToken,
  conversationId,
  bagIds: _bagIds,
  bagName,
}: {
  email: string;
  magicLinkToken: string;
  conversationId?: string;
  bagIds?: string[];
  bagName?: string;
}): Promise<void> {
  const emailer = getTransporter();
  if (!emailer) {
    logger.info('Email not configured - magic link email not sent');
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/auth/verify?token=${magicLinkToken}${
    conversationId ? `&conversation=${conversationId}` : ''
  }`;

  logger.debug(
    `DEBUG: Generated owner magic link URL: ${magicLinkUrl.substring(0, 80)}...`
  );

  const bagType = lowercaseBagName(bagName);

  const subject = conversationId
    ? `Someone found your ${bagType}! Click to respond`
    : 'Access your dashboard';

  const { textFooter, htmlFooter } = await getEmailFooter(email);

  const textBody = `
${conversationId ? `🎒 Great news! Someone found your ${bagType} and wants to return it.` : 'Access your dashboard'}

Click this secure link to ${conversationId ? 'respond to the finder' : 'access your dashboard'}:
${magicLinkUrl}

This link will expire in 24 hours.

${conversationId ? `You can securely communicate with the finder to arrange the return of your ${bagType}.` : 'You can view all your bags and manage any messages from finders.'}

If you didn't request this access, you can safely ignore this email.${textFooter}
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #356197; font-size: 24px;">
          ${conversationId ? `🎒 Someone found your ${bagType}!` : '🔐 Access your dashboard'}
        </h1>
      </div>

      <p style="color: #284971; margin-bottom: 20px;">
        ${
          conversationId
            ? `Great news! Someone found your ${bagType} and wants to return it. Click the secure link below to respond to the finder.`
            : 'Click the secure link below to view all your bags and manage any messages from finders.'
        }
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #356197; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          ${conversationId ? 'Respond to Finder' : 'Access Dashboard'}
        </a>
      </div>

      <div style="background-color: #fdf8e8; border-left: 4px solid #e7ba18; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #5c4a0a; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>

      <p style="color: #6894ca; font-size: 14px; margin-top: 30px;">
        If you didn't request this access, you can safely ignore this email.
      </p>
${htmlFooter}
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
    logger.info(`Magic link email sent to ${email}`);
  } catch (error) {
    logger.error(`Magic link email failed to ${email}:`, error);
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
    logger.info('Email not configured - finder magic link email not sent');
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/finder/conversation/${conversationId}?token=${magicLinkToken}`;

  logger.debug(
    `DEBUG: Generated finder magic link URL: ${magicLinkUrl.substring(0, 80)}...`
  );

  const subject = 'Your message was sent! Continue the conversation';

  const { textFooter, htmlFooter } = await getEmailFooter(email);

  const textBody = `
✅ Your message was sent to the bag owner!

Click this secure link to continue the conversation:
${magicLinkUrl}

This link will expire in 24 hours.

You can communicate securely with the owner to arrange the bag return.

Save this email to easily access the conversation later.${textFooter}
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #356197; font-size: 24px;">
          ✅ Your message was sent!
        </h1>
      </div>

      <p style="color: #284971; margin-bottom: 20px;">
        Your message has been delivered to the bag owner. Click the secure link below to continue the conversation and arrange the return.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #356197; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <div style="background-color: #fdf8e8; border-left: 4px solid #e7ba18; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #5c4a0a; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>

      <p style="color: #6894ca; font-size: 14px; margin-top: 30px;">
        Save this email to easily access the conversation later.
      </p>
${htmlFooter}
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
    logger.info(`Finder magic link email sent to ${email}`);
  } catch (error) {
    logger.error(`Finder magic link email failed to ${email}:`, error);
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
  const canSend = await shouldSendEmail(finderEmail, 'reply_notification');
  if (!canSend) {
    logger.info(
      `Skipping reply notification to ${finderEmail} - user has disabled this notification`
    );
    return;
  }

  const { magicLinkToken } = await generateFinderMagicLinkToken(
    finderEmail,
    conversationId
  );

  const emailer = getTransporter();
  if (!emailer) {
    logger.info('Email not configured - finder reply notification not sent');
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/finder/conversation/${conversationId}?token=${magicLinkToken}`;

  const { content: safeSenderName } = secureEmailContent(senderName);
  const { content: safeMessage } = secureEmailContent(message);

  const subject = `${safeSenderName} responded to you!`;

  const { textFooter, htmlFooter } = await getEmailFooter(finderEmail);

  const textBody = `
📬 ${safeSenderName} responded to you!

${safeSenderName} wrote:
"${safeMessage}"

Click this secure link to continue the conversation:
${magicLinkUrl}

This link will expire in 24 hours.${textFooter}
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #356197; font-size: 24px;">
          📬 ${safeSenderName} responded!
        </h1>
      </div>

      <div style="background-color: #ecf2f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #1b314b;">${safeSenderName} wrote:</h3>
        <p style="color: #284971; margin: 0; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;">"${safeMessage}"</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #356197; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <div style="background-color: #fdf8e8; border-left: 4px solid #e7ba18; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #5c4a0a; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>
${htmlFooter}
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
    logger.info(`Finder reply notification sent to ${finderEmail}`);
  } catch (error) {
    logger.error(`Finder reply notification failed to ${finderEmail}:`, error);
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
  const canSend = await shouldSendEmail(ownerEmail, 'reply_notification');
  if (!canSend) {
    logger.info(
      `Skipping reply notification to ${ownerEmail} - user has disabled this notification`
    );
    return;
  }

  const { magicLinkToken } = await generateMagicLinkToken(
    ownerEmail,
    conversationId,
    bagIds
  );

  const emailer = getTransporter();
  if (!emailer) {
    logger.info('Email not configured - owner reply notification not sent');
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/auth/verify?token=${magicLinkToken}&conversation=${conversationId}`;

  const { content: safeSenderName } = secureEmailContent(senderName);
  const { content: safeMessage } = secureEmailContent(message);

  const subject = `${safeSenderName} responded to you!`;

  const { textFooter, htmlFooter } = await getEmailFooter(ownerEmail);

  const textBody = `
💬 ${safeSenderName} responded to you!

${safeSenderName} wrote:
"${safeMessage}"

Click this secure link to continue the conversation:
${magicLinkUrl}

This link will expire in 24 hours.${textFooter}
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #356197; font-size: 24px;">
          💬 ${safeSenderName} responded!
        </h1>
      </div>

      <div style="background-color: #ecf2f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #1b314b;">${safeSenderName} wrote:</h3>
        <p style="color: #284971; margin: 0; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;">"${safeMessage}"</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #356197; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <div style="background-color: #fdf8e8; border-left: 4px solid #e7ba18; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #5c4a0a; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>
${htmlFooter}
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
    logger.info(`Owner reply notification sent to ${ownerEmail}`);
  } catch (error) {
    logger.error(`Owner reply notification failed to ${ownerEmail}:`, error);
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
  const canSend = await shouldSendEmail(
    finderEmail,
    'conversation_notification'
  );
  if (!canSend) {
    logger.info(
      `Skipping conversation notification to ${finderEmail} - user has disabled this notification`
    );
    return;
  }

  const { magicLinkToken } = await generateFinderMagicLinkToken(
    finderEmail,
    conversationId
  );

  const emailer = getTransporter();
  if (!emailer) {
    logger.info(
      'Email not configured - finder contextual notification not sent'
    );
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/finder/conversation/${conversationId}?token=${magicLinkToken}`;

  logger.debug(
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

  const { textFooter, htmlFooter } = await getEmailFooter(finderEmail);

  const textBody = `
${greeting}

${safeSenderName} wrote:
"${safeMessage}"

Click this secure link to continue the conversation:
${magicLinkUrl}

This link will expire in 24 hours.${textFooter}
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #356197; font-size: 24px;">
          ${greeting}
        </h1>
      </div>

      <p style="color: #284971; margin-bottom: 20px;">
        ${contextDescription}
      </p>

      <div style="background-color: #ecf2f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #1b314b;">${safeSenderName} wrote:</h3>
        <p style="color: #284971; margin: 0; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;">"${safeMessage}"</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #356197; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <div style="background-color: #fdf8e8; border-left: 4px solid #e7ba18; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #5c4a0a; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>
${htmlFooter}
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
    logger.info(
      `Contextual ${context} notification sent to finder ${finderEmail}`
    );
  } catch (error) {
    logger.error(
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
  const canSend = await shouldSendEmail(
    ownerEmail,
    'conversation_notification'
  );
  if (!canSend) {
    logger.info(
      `Skipping conversation notification to ${ownerEmail} - user has disabled this notification`
    );
    return;
  }

  const { magicLinkToken } = await generateMagicLinkToken(
    ownerEmail,
    conversationId,
    bagIds
  );

  const emailer = getTransporter();
  if (!emailer) {
    logger.info(
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

  const { textFooter, htmlFooter } = await getEmailFooter(ownerEmail);

  const textBody = `
${greeting}

${safeSenderName} wrote:
"${safeMessage}"

Click this secure link to continue the conversation:
${magicLinkUrl}

This link will expire in 24 hours.${textFooter}
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #356197; font-size: 24px;">
          ${greeting}
        </h1>
      </div>

      <p style="color: #284971; margin-bottom: 20px;">
        ${contextDescription}
      </p>

      <div style="background-color: #ecf2f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #1b314b;">${safeSenderName} wrote:</h3>
        <p style="color: #284971; margin: 0; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;">"${safeMessage}"</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #356197; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Continue Conversation
        </a>
      </div>

      <div style="background-color: #fdf8e8; border-left: 4px solid #e7ba18; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #5c4a0a; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>
${htmlFooter}
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
    logger.info(
      `Contextual ${context} notification sent to owner ${ownerEmail}`
    );
  } catch (error) {
    logger.error(
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

  const emailer = getTransporter();
  if (!emailer) {
    logger.info(
      'Email not configured - conversation resolved notification not sent'
    );
    return;
  }

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/finder/conversation/${conversationId}?token=${magicLinkToken}`;

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

  const subject = `Conversation about ${bagDisplayName} has been resolved`;

  const { textFooter, htmlFooter } = await getEmailFooter(finderEmail);

  const textBody = `
✅ Good news! The conversation about ${bagDisplayName} has been marked as resolved.

You can still view the full conversation history by clicking this secure link:
${magicLinkUrl}

This link will expire in 24 hours.

Thank you for using YouFoundMyBag.com to help reunite lost items with their owners!${textFooter}
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2aa248; font-size: 24px;">
          ✅ Conversation Resolved!
        </h1>
      </div>

      <p style="color: #284971; margin-bottom: 20px;">
        Good news! The conversation about <strong>${bagDisplayName}</strong> has been marked as resolved by the bag owner.
      </p>

      <p style="color: #284971; margin-bottom: 20px;">
        You can still view the full conversation history if needed:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #356197; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          View Conversation
        </a>
      </div>

      <div style="background-color: #fdf8e8; border-left: 4px solid #e7ba18; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #5c4a0a; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours.
        </p>
      </div>

      <p style="color: #284971; text-align: center; margin: 30px 0;">
        Thank you for using YouFoundMyBag.com to help reunite lost items with their owners!
      </p>
${htmlFooter}
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
    logger.info(
      `Conversation resolved notification sent to finder ${finderEmail}`
    );
  } catch (error) {
    logger.error(
      `Conversation resolved notification failed to ${finderEmail}:`,
      error
    );
    throw error;
  }
}

export async function sendBagCreatedEmail({
  email,
  bagName,
  shortId,
  bagUrl,
}: {
  email: string;
  ownerName?: string;
  bagName?: string;
  shortId: string;
  bagUrl: string;
}): Promise<void> {
  const canSend = await shouldSendEmail(email, 'bag_created');
  if (!canSend) {
    logger.info(
      `Skipping bag created email to ${email} - user has disabled this notification`
    );
    return;
  }

  const emailer = getTransporter();
  if (!emailer) {
    logger.info('Email not configured - bag created email not sent');
    return;
  }

  const { magicLinkToken } = await generateMagicLinkToken(email);

  const dashboardUrl = getDashboardUrl();
  const magicLinkUrl = `${dashboardUrl}/auth/verify?token=${magicLinkToken}`;

  const bagType = lowercaseBagName(bagName);
  const { content: safeBagType } = secureEmailContent(bagType);

  const yourBag = bagName ? `your ${safeBagType}` : 'your bag';

  const subject = `Your ${bagType} tag is ready! Access your dashboard`;

  const { textFooter, htmlFooter } = await getEmailFooter(email);

  const textBody = `

Your ${bagType} tag (${shortId}) has been successfully created!

Your bag's unique page: ${bagUrl}

What's next?
• Print and attach the QR code to ${yourBag}
• If someone finds ${yourBag}, they'll scan the code and can contact you securely
• Access your dashboard anytime to manage ${yourBag} and view messages

Click this secure link to access your dashboard:
${magicLinkUrl}

This link will expire in 24 hours. You can request a new one anytime.${textFooter}
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #356197; font-size: 24px;">
          Your ${safeBagType} tag is ready!
        </h1>
      </div>

      <p style="color: #284971; margin-bottom: 20px;">
        Your ${safeBagType} tag <strong>(${shortId})</strong> has been successfully created!
      </p>

      <div style="background-color: #ecf2f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; color: #1b314b; font-weight: bold;">Your bag's unique page:</p>
        <a href="${bagUrl}" style="color: #356197; word-break: break-all;">${bagUrl}</a>
      </div>

      <div style="background-color: #ecf2f8; border-left: 4px solid #356197; padding: 15px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #284971; font-size: 16px;">What's next?</h3>
        <ul style="margin: 0; padding-left: 20px; color: #284971;">
          <li style="margin-bottom: 8px;">Print and attach the QR code to ${yourBag}</li>
          <li style="margin-bottom: 8px;">If someone finds ${yourBag}, they'll scan the code and can contact you securely</li>
          <li>Access your dashboard anytime to manage ${yourBag} and view messages</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}"
           style="background-color: #356197; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Access Your Dashboard
        </a>
      </div>

      <div style="background-color: #fdf8e8; border-left: 4px solid #e7ba18; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #5c4a0a; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 24 hours. You can request a new one anytime.
        </p>
      </div>
${htmlFooter}
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
    logger.info(`Bag created email sent to ${email}`);
  } catch (error) {
    logger.error(`Bag created email failed to ${email}:`, error);
    throw error;
  }
}

export async function sendMagicLinkReissueEmail(
  email: string,
  magicLinkToken: string,
  bagIds: string[]
): Promise<void> {
  const magicLink = `${config.FRONTEND_URL}/auth/verify?token=${magicLinkToken}`;

  const { textFooter, htmlFooter } = await getEmailFooter(email);

  const subject = 'Your new access link for YouFoundMyBag.com';

  const textBody = `
Your New Access Link

We've generated a new magic link for you to access your bags and conversations on YouFoundMyBag.com.

Click here to access your dashboard:
${magicLink}

This link expires in 7 days.

If you didn't request this, you can safely ignore this email.

${textFooter}
  `;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1b314b;">
      <h1 style="color: #1b314b; font-size: 28px; font-weight: 700; margin-bottom: 24px;">
        🔑 Your New Access Link
      </h1>

      <p style="color: #284971; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        We've generated a new magic link for you to access your bags and conversations on YouFoundMyBag.com.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLink}" style="background-color: #356197; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
          Access Your Dashboard
        </a>
      </div>

      <div style="background-color: #fdf8e8; border-left: 4px solid #e7ba18; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #5c4a0a; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 7 days.
        </p>
      </div>

      <p style="color: #6894ca; font-size: 14px; line-height: 1.6; margin-top: 24px;">
        If you didn't request this, you can safely ignore this email. Your account remains secure.
      </p>

${htmlFooter}
    </div>
  `;

  const transporter = getTransporter();
  if (!transporter) {
    logger.error('Email transporter not available');
    throw new Error('Email service not configured');
  }

  try {
    await transporter.sendMail({
      from: config.SMTP_FROM,
      to: email,
      subject,
      text: textBody,
      html: htmlBody,
    });
    logger.info(
      `Magic link reissue email sent to ${email} for ${bagIds.length} bags`
    );
  } catch (error) {
    logger.error(`Magic link reissue email failed to ${email}:`, error);
    throw error;
  }
}

export async function sendFinderMagicLinkReissueEmail(
  email: string,
  magicLinkToken: string,
  conversationId: string
): Promise<void> {
  const magicLink = `${config.FRONTEND_URL}/finder/conversation/${conversationId}?token=${magicLinkToken}`;

  const { textFooter, htmlFooter } = await getEmailFooter(email);

  const subject = 'Your new conversation link for YouFoundMyBag.com';

  const textBody = `
Your New Conversation Link

We've generated a new link for you to continue your conversation on YouFoundMyBag.com.

Click here to continue:
${magicLink}

This link expires in 7 days.

If you didn't request this, you can safely ignore this email.

${textFooter}
  `;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1b314b;">
      <h1 style="color: #1b314b; font-size: 28px; font-weight: 700; margin-bottom: 24px;">
        🔑 Your New Conversation Link
      </h1>

      <p style="color: #284971; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        We've generated a new link for you to continue your conversation on YouFoundMyBag.com.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLink}" style="background-color: #356197; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
          Continue Conversation
        </a>
      </div>

      <div style="background-color: #fdf8e8; border-left: 4px solid #e7ba18; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #5c4a0a; font-size: 14px;">
          🔒 <strong>Security Notice:</strong> This link expires in 7 days.
        </p>
      </div>

      <p style="color: #6894ca; font-size: 14px; line-height: 1.6; margin-top: 24px;">
        If you didn't request this, you can safely ignore this email.
      </p>

${htmlFooter}
    </div>
  `;

  const transporter = getTransporter();
  if (!transporter) {
    logger.error('Email transporter not available');
    throw new Error('Email service not configured');
  }

  try {
    await transporter.sendMail({
      from: config.SMTP_FROM,
      to: email,
      subject,
      text: textBody,
      html: htmlBody,
    });
    logger.info(
      `Finder magic link reissue email sent to ${email} for conversation ${conversationId}`
    );
  } catch (error) {
    logger.error(`Finder magic link reissue email failed to ${email}:`, error);
    throw error;
  }
}
