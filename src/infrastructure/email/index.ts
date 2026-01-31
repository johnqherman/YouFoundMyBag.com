import { logger } from '../logger/index.js';
import { secureEmailContent } from '../security/sanitization.js';
import { sendMail, getMailgunClient } from './mailgun.js';
import { getDashboardUrl, getEmailFooter } from './utils.js';

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
  if (!getMailgunClient()) {
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
    await sendMail({
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

export {
  sendMagicLink,
  sendContextualNotification,
  sendConversationResolved,
  sendBagCreated,
  sendMagicLinkReissue,
} from './service.js';

export {
  queueMagicLinkEmail,
  queueFinderMagicLinkEmail,
  queueContextualOwnerNotification,
  queueContextualFinderNotification,
  queueConversationResolvedNotification,
} from './queue-helpers.js';
