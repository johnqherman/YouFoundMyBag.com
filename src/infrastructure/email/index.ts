import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (
    !transporter &&
    config.SMTP_HOST &&
    config.SMTP_USER &&
    config.SMTP_PASS
  ) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: false,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendContactEmail(
  contacts: any[],
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

  const subject = `Someone found your bag${bagDisplayName ? ` (${bagDisplayName})` : ''}!`;
  const textBody = `
Good news! Someone found your bag.

Message: "${message}"

${senderInfo ? `Contact info: ${senderInfo}` : ''}

This message was sent through YouFoundMyBag.com
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
