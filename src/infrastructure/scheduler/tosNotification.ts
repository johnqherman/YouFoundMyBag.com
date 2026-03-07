import { logger } from '../logger/index.js';
import { pool } from '../database/index.js';
import {
  getOrCreatePreferences,
  markTermsVersionNotified,
} from '../../features/email-preferences/repository.js';
import { sendSystemUpdateEmail } from '../email/service.js';
import { emailParagraph } from '../email/templates.js';
import { config } from '../config/index.js';
import { CURRENT_TERMS_VERSION } from '../../client/constants/legalConstants.js';
import { TIME_MS as t } from 'client/constants/timeConstants.js';

async function getAllOwnerEmails(): Promise<string[]> {
  const result = await pool.query(
    'SELECT DISTINCT owner_email FROM bags WHERE owner_email IS NOT NULL'
  );
  return result.rows.map((row: { owner_email: string }) => row.owner_email);
}

export async function runTosNotifications(): Promise<void> {
  logger.info('Starting ToS notification task');

  let emails: string[];
  try {
    emails = await getAllOwnerEmails();
  } catch (error) {
    logger.error('Failed to fetch owner emails for ToS notifications', {
      error,
    });
    return;
  }

  logger.info(
    `Found ${emails.length} bag owner emails to check for ToS notifications`
  );

  const BATCH_SIZE = 50;

  let notified = 0;
  let skipped = 0;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (email) => {
        try {
          const prefs = await getOrCreatePreferences(email);

          if (prefs.terms_version_notified === CURRENT_TERMS_VERSION) {
            skipped++;
            return;
          }

          if (!prefs.all_emails_enabled || !prefs.system_updates_enabled) {
            skipped++;
            return;
          }

          await sendSystemUpdateEmail(email, {
            subject: 'Updates to YouFoundMyBag Terms of Service',
            title: 'Our Terms of Service Have Been Updated',
            bodyHtml:
              emailParagraph(
                "We've updated our Terms of Service and Privacy Policy. These updates reflect improvements to how we handle your data and describe our services more clearly."
              ) +
              emailParagraph(
                `The updated terms are effective as of ${CURRENT_TERMS_VERSION}. By continuing to use YouFoundMyBag, you agree to the updated terms.`
              ) +
              emailParagraph(
                'Please review the updated documents to understand any changes that may affect you.'
              ),
            ctaUrl: `${config.FRONTEND_URL}/terms`,
            ctaText: 'Review Terms of Service',
          });

          await markTermsVersionNotified(email, CURRENT_TERMS_VERSION);
          notified++;
        } catch (err) {
          logger.error('Failed to send ToS notification', {
            email,
            error: err,
          });
        }
      })
    );

    if (i + BATCH_SIZE < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, t.ONE_SECOND));
    }
  }

  logger.info('ToS notification task completed', { notified, skipped });
}
