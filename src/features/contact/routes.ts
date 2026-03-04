import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../infrastructure/logger/index.js';
import { sendMail } from '../../infrastructure/email/mailgun.js';
import { config } from '../../infrastructure/config/index.js';
import { emailSchema } from '../../infrastructure/utils/validation.js';

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
  billing: 'Billing',
  other: 'Other',
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

  try {
    await Promise.all([
      sendMail({
        to: contactEmail,
        from: config.EMAIL_FROM,
        replyTo: email,
        subject: `[YouFoundMyBag Contact] ${subjectLabel}: from ${name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <h2 style="color: #1e3a5f; margin-bottom: 4px;">New Contact Form Submission</h2>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 0; width: 100px; font-weight: 600; color: #475569;">Name</td>
                <td style="padding: 8px 0;">${escapeHtml(name)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #475569;">Email</td>
                <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #1e3a5f;">${escapeHtml(email)}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #475569;">Subject</td>
                <td style="padding: 8px 0;">${escapeHtml(subjectLabel)}</td>
              </tr>
            </table>

            <h3 style="color: #1e3a5f; margin-bottom: 8px;">Message</h3>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; white-space: pre-wrap; line-height: 1.6;">
              ${escapeHtml(message)}
            </div>
          </div>
        `,
        text: `New contact form submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subjectLabel}\n\nMessage:\n${message}`,
      }),
      sendMail({
        to: email,
        from: config.EMAIL_CONTACT,
        subject: `We received your message – YouFoundMyBag`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <h2 style="color: #1e3a5f; margin-bottom: 4px;">Thanks for reaching out, ${escapeHtml(name)}!</h2>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />

            <p style="line-height: 1.6; margin-bottom: 16px;">
              We've received your message and will get back to you within 1–2 business days.
            </p>

            <h3 style="color: #1e3a5f; margin-bottom: 8px;">Your message</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <tr>
                <td style="padding: 6px 0; width: 80px; font-weight: 600; color: #475569; font-size: 14px;">Subject</td>
                <td style="padding: 6px 0; font-size: 14px;">${escapeHtml(subjectLabel)}</td>
              </tr>
            </table>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; white-space: pre-wrap; line-height: 1.6; font-size: 14px;">
              ${escapeHtml(message)}
            </div>

            <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
              — The YouFoundMyBag team
            </p>
          </div>
        `,
        text: `Thanks for reaching out, ${name}!\n\nWe've received your message and will get back to you within 1–2 business days.\n\nYour message:\nSubject: ${subjectLabel}\n\n${message}\n\n— The YouFoundMyBag team`,
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export default router;
