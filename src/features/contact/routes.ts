import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../infrastructure/logger/index.js';
import { sendMail } from '../../infrastructure/email/mailgun.js';
import { config } from '../../infrastructure/config/index.js';
import { emailSchema } from '../../infrastructure/utils/validation.js';
import {
  emailContainer,
  emailHeader,
  emailParagraph,
  emailInfoBox,
  emailDivider,
  EmailStyles,
  EmailText,
} from '../../infrastructure/email/templates.js';
import { secureEmailContent } from '../../infrastructure/security/sanitization.js';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(80),
  email: emailSchema,
  subject: z.enum(['general', 'bug', 'feature', 'billing', 'other']),
  message: z.string().min(1).max(1000),
});

const subjectLabels: Record<string, string> = {
  general: 'General Inquiry',
  bug: 'Bug Report',
  feature: 'Feature Request',
  billing: 'Billing Question',
  other: 'Other Inquiry',
};

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const result = contactSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Please check your submission and try again.',
      details: result.error.issues,
    });
    return;
  }

  const { name, email, subject, message } = result.data;
  const subjectLabel = subjectLabels[subject] ?? subject;
  const contactEmail = config.EMAIL_CONTACT;

  const { content: safeName } = secureEmailContent(name);
  const { content: safeEmail } = secureEmailContent(email);
  const { content: safeSubjectLabel } = secureEmailContent(subjectLabel);

  const senderInfoBox = `
    <p style="${EmailStyles.text.body}; margin: 0;"><a href="mailto:${safeEmail}" style="color: #356197;">${safeEmail}</a></p>
  `;

  const { content: safeMessage } = secureEmailContent(message);

  const internalHtml = emailContainer(
    emailHeader(`${safeSubjectLabel} from ${safeName}`) +
      emailInfoBox(senderInfoBox) +
      emailInfoBox(
        `<p style="${EmailStyles.box.messageText}">${safeMessage}</p>`
      ) +
      emailDivider() +
      emailParagraph(EmailText.brandMessage, 'mutedSmall')
  );

  const confirmationHtml = emailContainer(
    emailHeader(`Thanks for reaching out, ${safeName}!`) +
      emailParagraph(
        "We've received your message and will get back to you within 1–2 business days."
      ) +
      emailInfoBox(
        `<p style="${EmailStyles.box.messageText}">${safeMessage}</p>`
      ) +
      emailDivider() +
      emailParagraph(EmailText.brandMessage, 'mutedSmall')
  );

  try {
    logger.info(
      `Contact form submission from ${email}: attempting to send emails`
    );
    await Promise.all([
      sendMail({
        to: contactEmail,
        from: config.EMAIL_FROM,
        replyTo: email,
        subject: `[YouFoundMyBag Contact] ${subjectLabel}: from ${name}`,
        html: internalHtml,
        text: `Contact form submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subjectLabel}\n\nMessage:\n${message}`,
      }),
      sendMail({
        to: email,
        from: config.EMAIL_CONTACT,
        subject: `We received your message – YouFoundMyBag`,
        html: confirmationHtml,
        text: `Thanks for reaching out, ${name}!\n\nWe've received your message and will get back to you within 1–2 business days.\n\nYour message:\nSubject: ${subjectLabel}\n\n${message}\n\nThe YouFoundMyBag team`,
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error sending contact email:', error);
    res.status(500).json({
      error: 'send_failed',
      message: 'Failed to send your message. Please try again later.',
    });
  }
});

export default router;
