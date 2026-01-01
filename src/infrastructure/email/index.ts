import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import type { Contact } from '../../client/types/index.js';
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

export async function sendContactEmail(
  contacts: Contact[],
  message: string,
  senderInfo?: string,
  bagDisplayName?: string
): Promise<void> {
  const emailer = getTransporter();
  if (!emailer) {
    console.log('Email not configured - message saved but not sent');
    return;
  }

  const emailContacts = contacts.filter((c) => c.type === 'email');
  if (emailContacts.length === 0) return;

  const { content: safeMessage } = secureEmailContent(message);
  const safeSenderInfo = senderInfo
    ? secureEmailContent(senderInfo).content
    : '';
  const safeBagDisplayName = bagDisplayName
    ? secureEmailContent(bagDisplayName).content
    : '';

  const subject = `Someone found your bag${safeBagDisplayName ? ` (${safeBagDisplayName})` : ''}!`;
  const textBody = `
Good news! Someone found your bag.

Message: "${safeMessage}"

${safeSenderInfo ? `Contact info: ${safeSenderInfo}` : ''}

Message sent via YouFoundMyBag.com
  `;

  for (const contact of emailContacts) {
    try {
      await emailer.sendMail({
        from: config.SMTP_FROM,
        to: contact.value,
        subject,
        text: textBody,
      });
      console.log(`Email sent to ${contact.value}`);
    } catch (error) {
      console.error(`Email failed to ${contact.value}:`, error);
    }
  }
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

export async function sendContextualFinderNotification({
  finderEmail,
  senderName,
  message,
  conversationId,
  context,
}: {
  finderEmail: string;
  senderName: string;
  message: string;
  conversationId: string;
  context: MessageContext;
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

  let subject: string;
  let greeting: string;
  let contextDescription: string;

  switch (context) {
    case 'initial':
      subject = 'The bag owner responded to you!';
      greeting = '📬 The bag owner responded to your message!';
      contextDescription =
        'The bag owner responded to your message. Click the secure link below to continue the conversation and arrange the bag return.';
      break;
    case 'follow-up':
      subject = `New message from ${safeSenderName}`;
      greeting = `📬 ${safeSenderName} sent you another message!`;
      contextDescription = `${safeSenderName} sent you a follow-up message. Click the secure link below to continue the conversation.`;
      break;
    case 'response':
      subject = `${safeSenderName} replied to your message!`;
      greeting = `📬 ${safeSenderName} replied to your message!`;
      contextDescription = `${safeSenderName} replied to your message. Click the secure link below to continue the conversation.`;
      break;
  }

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
}: {
  ownerEmail: string;
  senderName: string;
  message: string;
  conversationId: string;
  bagIds: string[];
  context: MessageContext;
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

  let subject: string;
  let greeting: string;
  let contextDescription: string;

  switch (context) {
    case 'initial':
      subject = 'Someone found your bag! Click to respond';
      greeting = '🎒 Someone found your bag!';
      contextDescription =
        'Great news! Someone found your bag and wants to return it. Click the secure link below to respond to the finder.';
      break;
    case 'follow-up':
      subject = 'New message about your bag from the finder';
      greeting = '📬 New message about your bag!';
      contextDescription =
        'The finder sent you another message about your bag. Click the secure link below to view the message and respond.';
      break;
    case 'response':
      subject = `${safeSenderName} replied to your message!`;
      greeting = `💬 ${safeSenderName} replied to your message!`;
      contextDescription = `${safeSenderName} replied to your message. Click the secure link below to continue the conversation.`;
      break;
  }

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
