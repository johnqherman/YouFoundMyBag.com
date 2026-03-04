import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

const mailgun = new Mailgun(formData);

type MailgunClient = ReturnType<typeof mailgun.client>;

let client: MailgunClient | null = null;

export function getMailgunClient(): MailgunClient | null {
  if (!client) {
    if (config.MAILGUN_API_KEY && config.MAILGUN_DOMAIN) {
      client = mailgun.client({
        username: 'api',
        key: config.MAILGUN_API_KEY,
        url: config.MAILGUN_URL,
      });
      logger.info(
        `Mailgun client initialized: domain=${config.MAILGUN_DOMAIN}, url=${config.MAILGUN_URL}`
      );
    } else if (config.NODE_ENV === 'production') {
      logger.warn(
        'Mailgun not configured: MAILGUN_API_KEY or MAILGUN_DOMAIN missing. Emails will not be sent.'
      );
    }
  }
  return client;
}

export function resetMailgunClient(): void {
  client = null;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const from = options.from ?? config.EMAIL_FROM;

  if (config.NODE_ENV === 'development') {
    const linkMatch = options.html.match(/href="([^"]*token=[^"]*)"/);
    logger.warn(
      `Email not sent. Would have sent to: ${options.to} | Subject: "${options.subject}"${linkMatch ? ` | Link: ${linkMatch[1]}` : ''}`
    );
    return;
  }

  const mg = getMailgunClient();
  if (!mg) {
    throw new Error('Mailgun not configured');
  }

  await mg.messages.create(config.MAILGUN_DOMAIN!, {
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    'h:Reply-To': options.replyTo,
  });

  logger.info(`Email sent to ${options.to} | Subject: "${options.subject}"`);
}
