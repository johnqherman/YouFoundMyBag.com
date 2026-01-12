import { secureEmailContent } from '../security/sanitization.js';

export const EmailStyles = {
  container:
    'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;',

  header: {
    wrapper: 'text-align: center; margin-bottom: 30px;',
    title: 'color: #356197; font-size: 24px;',
    titleSuccess: 'color: #2aa248; font-size: 24px;',
  },

  text: {
    body: 'color: #284971; margin-bottom: 20px;',
    muted: 'color: #6894ca; font-size: 14px; margin-top: 30px;',
    mutedSmall: 'color: #6894ca; font-size: 12px; text-align: center;',
    centered: 'color: #284971; text-align: center; margin: 30px 0;',
  },

  button: {
    wrapper: 'text-align: center; margin: 30px 0;',
    link: 'background-color: #356197; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;',
  },

  box: {
    messageQuote:
      'background-color: #ecf2f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;',
    messageTitle: 'margin-top: 0; color: #1b314b;',
    messageText:
      'color: #284971; margin: 0; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;',
    info: 'background-color: #ecf2f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;',
    infoWithBorder:
      'background-color: #ecf2f8; border-left: 4px solid #356197; padding: 15px; margin: 20px 0;',
    infoTitle: 'margin: 0 0 10px 0; color: #1b314b; font-weight: bold;',
  },

  security: {
    wrapper:
      'background-color: #fdf8e8; border-left: 4px solid #e7ba18; padding: 15px; margin: 20px 0;',
    text: 'margin: 0; color: #5c4a0a; font-size: 14px;',
  },

  footer: {
    divider: 'border: none; border-top: 1px solid #b4cae4; margin: 30px 0;',
    text: 'color: #6894ca; font-size: 12px; text-align: center; margin-bottom: 8px;',
    link: 'color: #6894ca; text-decoration: underline;',
  },
} as const;

export const EmailText = {
  securityNotice24h:
    '🔒 <strong>Security Notice:</strong> This link expires in 24 hours.',
  securityNotice7d:
    '🔒 <strong>Security Notice:</strong> This link expires in 7 days.',
  brandMessage: 'YouFoundMyBag.com - Privacy-first lost item recovery',
  secureMessaging:
    "This message was sent through YouFoundMyBag.com's secure messaging system.",
} as const;

export function emailContainer(content: string): string {
  return `
    <div style="${EmailStyles.container}">
${content}
    </div>
  `;
}

export function emailHeader(title: string, isSuccess = false): string {
  const titleStyle = isSuccess
    ? EmailStyles.header.titleSuccess
    : EmailStyles.header.title;
  return `
      <div style="${EmailStyles.header.wrapper}">
        <h1 style="${titleStyle}">
          ${title}
        </h1>
      </div>
`;
}

export function emailParagraph(
  text: string,
  style: keyof typeof EmailStyles.text = 'body'
): string {
  return `
      <p style="${EmailStyles.text[style]}">
        ${text}
      </p>
`;
}

export function emailButton(url: string, text: string): string {
  return `
      <div style="${EmailStyles.button.wrapper}">
        <a href="${url}"
           style="${EmailStyles.button.link}">
          ${text}
        </a>
      </div>
`;
}

export function emailMessageQuote(senderName: string, message: string): string {
  const { content: safeSenderName } = secureEmailContent(senderName);
  const { content: safeMessage } = secureEmailContent(message);

  return `
      <div style="${EmailStyles.box.messageQuote}">
        <h3 style="${EmailStyles.box.messageTitle}">${safeSenderName} wrote:</h3>
        <p style="${EmailStyles.box.messageText}">"${safeMessage}"</p>
      </div>
`;
}

export function emailSecurityNotice(expiryTime: '24h' | '7d' = '24h'): string {
  const text =
    expiryTime === '24h'
      ? EmailText.securityNotice24h
      : EmailText.securityNotice7d;
  return `
      <div style="${EmailStyles.security.wrapper}">
        <p style="${EmailStyles.security.text}">
          ${text}
        </p>
      </div>
`;
}

export function emailInfoBox(content: string, withBorder = false): string {
  const style = withBorder
    ? EmailStyles.box.infoWithBorder
    : EmailStyles.box.info;
  return `
      <div style="${style}">
        ${content}
      </div>
`;
}

export function emailFooter(preferencesUrl: string): string {
  return `
      <hr style="${EmailStyles.footer.divider}">

      <p style="${EmailStyles.footer.text}">
        ${EmailText.brandMessage}
      </p>

      <p style="${EmailStyles.footer.text}">
        <a href="${preferencesUrl}" style="${EmailStyles.footer.link}">Manage your email preferences</a>
      </p>
`;
}

export function emailDivider(): string {
  return `
      <hr style="${EmailStyles.footer.divider}">
`;
}

export interface MagicLinkEmailParams {
  magicLinkUrl: string;
  greeting: string;
  description: string;
  buttonText: string;
  footerText?: string;
  preferencesUrl: string;
}

export function buildMagicLinkEmail(params: MagicLinkEmailParams): string {
  return emailContainer(
    emailHeader(params.greeting) +
      emailParagraph(params.description) +
      emailButton(params.magicLinkUrl, params.buttonText) +
      emailSecurityNotice('24h') +
      (params.footerText ? emailParagraph(params.footerText, 'muted') : '') +
      emailFooter(params.preferencesUrl)
  );
}

export interface NotificationEmailParams {
  greeting: string;
  description?: string;
  senderName: string;
  message: string;
  continueUrl: string;
  buttonText: string;
  preferencesUrl: string;
}

export function buildNotificationEmail(
  params: NotificationEmailParams
): string {
  return emailContainer(
    emailHeader(params.greeting) +
      (params.description ? emailParagraph(params.description) : '') +
      emailMessageQuote(params.senderName, params.message) +
      emailButton(params.continueUrl, params.buttonText) +
      emailSecurityNotice('24h') +
      emailFooter(params.preferencesUrl)
  );
}

export interface ResolvedEmailParams {
  bagDisplayName: string;
  htmlBagDisplayName: string;
  continueUrl: string;
  preferencesUrl: string;
}

export function buildConversationResolvedEmail(
  params: ResolvedEmailParams
): string {
  return emailContainer(
    emailHeader('✅ Conversation Resolved!', true) +
      emailParagraph(
        `Good news! The conversation about ${params.htmlBagDisplayName} has been marked as resolved by the bag owner.`
      ) +
      emailParagraph(
        'You can still view the full conversation history if needed:'
      ) +
      emailButton(params.continueUrl, 'View Conversation') +
      emailSecurityNotice('24h') +
      emailParagraph(
        'Thank you for using YouFoundMyBag.com to help reunite lost items with their owners!',
        'centered'
      ) +
      emailFooter(params.preferencesUrl)
  );
}

export interface BagCreatedEmailParams {
  bagType: string;
  shortId: string;
  bagUrl: string;
  yourBag: string;
  magicLinkUrl: string;
  preferencesUrl: string;
}

export function buildBagCreatedEmail(params: BagCreatedEmailParams): string {
  const whatNextContent = `
        <h3 style="${EmailStyles.box.infoTitle}">What's next?</h3>
        <ul style="margin: 0; padding-left: 20px; color: #284971;">
          <li style="margin-bottom: 8px;">Print and attach the QR code to ${params.yourBag}</li>
          <li style="margin-bottom: 8px;">If someone finds ${params.yourBag}, they'll scan the code and can contact you securely</li>
          <li>Access your dashboard anytime to manage ${params.yourBag} and view messages</li>
        </ul>
`;

  const urlBoxContent = `
        <p style="${EmailStyles.box.infoTitle}">Your bag's unique page:</p>
        <a href="${params.bagUrl}" style="color: #356197; word-break: break-all;">${params.bagUrl}</a>
`;

  return emailContainer(
    emailHeader(`Your ${params.bagType} tag is ready!`) +
      emailParagraph(
        `Your ${params.bagType} tag <strong>(${params.shortId})</strong> has been successfully created!`
      ) +
      emailInfoBox(urlBoxContent) +
      emailInfoBox(whatNextContent, true) +
      emailButton(params.magicLinkUrl, 'Access Your Dashboard') +
      emailSecurityNotice('24h') +
      emailFooter(params.preferencesUrl)
  );
}

export interface ReissueEmailParams {
  title: string;
  description: string;
  magicLinkUrl: string;
  buttonText: string;
  expiryDays: '7d';
  preferencesUrl: string;
}

export function buildReissueEmail(params: ReissueEmailParams): string {
  return emailContainer(
    emailHeader(params.title) +
      emailParagraph(params.description) +
      emailButton(params.magicLinkUrl, params.buttonText) +
      emailSecurityNotice(params.expiryDays) +
      emailParagraph(
        "If you didn't request this, you can safely ignore this email. Your account remains secure.",
        'muted'
      ) +
      emailFooter(params.preferencesUrl)
  );
}
