import { getUnsubscribeToken } from '../../features/email-preferences/service.js';
import { emailFooter } from './templates.js';

export function getDashboardUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

export async function getEmailFooter(email: string): Promise<{
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

  const htmlFooter = emailFooter(preferencesUrl);

  return { textFooter, htmlFooter };
}
