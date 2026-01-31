import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

const mailgun = new Mailgun(formData);

type MailgunClient = ReturnType<typeof mailgun.client>;

let client: MailgunClient | null = null;

export function getMailgunClient(): MailgunClient | null {
  if (!client && config.MAILGUN_API_KEY && config.MAILGUN_DOMAIN) {
    client = mailgun.client({
      username: 'api',
      key: config.MAILGUN_API_KEY,
      url: config.MAILGUN_URL,
    });

    if (config.NODE_ENV === 'development') {
      logger.debug(
        `Mailgun configured: domain=${config.MAILGUN_DOMAIN}, url=${config.MAILGUN_URL}`
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
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const mg = getMailgunClient();
  if (!mg) {
    throw new Error('Mailgun not configured');
  }

  await mg.messages.create(config.MAILGUN_DOMAIN!, {
    from: config.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
