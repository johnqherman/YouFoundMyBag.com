import { Request } from 'express';
import { MessageContext } from '../../features/types/index.js';

export interface RedisError extends Error {
  code?: string;
  errno?: number;
}

export interface DatabaseSSLConfig {
  rejectUnauthorized: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

export interface EmailValidationResult {
  valid: boolean;
  warnings: string[];
  details: {
    syntaxValid: boolean;
    mxRecords: boolean | null;
    disposableEmail: boolean | null;
    typoDetected: boolean | null;
  };
}

export interface EmailValidationOptions {
  fields?: string[];
}

export interface RequestWithEmailValidation extends Request {
  emailValidation?: Record<string, EmailValidationResult>;
}

export interface MagicLinkEmailParams {
  magicLinkUrl: string;
  greeting: string;
  description: string;
  buttonText: string;
  footerText?: string;
  preferencesUrl: string;
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

export interface ResolvedEmailParams {
  bagDisplayName: string;
  htmlBagDisplayName: string;
  continueUrl: string;
  preferencesUrl: string;
}

export interface BagCreatedEmailParams {
  bagType: string;
  shortId: string;
  bagUrl: string;
  yourBag: string;
  magicLinkUrl: string;
  preferencesUrl: string;
}

export interface ReissueEmailParams {
  title: string;
  description: string;
  magicLinkUrl: string;
  buttonText: string;
  expiryDays: '7d';
  preferencesUrl: string;
}

export interface SMTPTLSConfig {
  rejectUnauthorized?: boolean;
  minVersion?: string;
}

export interface SMTPTransportConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user?: string;
    pass?: string;
  };
  requireTLS?: boolean;
  tls?: SMTPTLSConfig;
}

export interface PersonalizationContext {
  context: MessageContext;
  senderType: 'finder' | 'owner';
  recipientType: 'finder' | 'owner';
}

export interface NameInfo {
  ownerName?: string;
  bagName?: string;
  finderName?: string;
}

export interface EmailJobData {
  type: 'magic_link_owner' | 'magic_link_finder' | 'new_message_notification';
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  conversationId?: string;
  bagShortId?: string;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number | null;
  state: 'closed' | 'open' | 'half-open';
}

export type UserType = 'owner' | 'finder';

export interface BaseMagicLinkParams {
  email: string;
  magicLinkToken: string;
  conversationId?: string;
}

export interface OwnerMagicLinkParams extends BaseMagicLinkParams {
  userType: 'owner';
  bagIds?: string[];
  bagName?: string;
}

export interface FinderMagicLinkParams extends BaseMagicLinkParams {
  userType: 'finder';
  conversationId: string;
}

export type MagicLinkParams = OwnerMagicLinkParams | FinderMagicLinkParams;

export interface BaseNotificationParams {
  senderName: string;
  message: string;
  conversationId: string;
}

export interface OwnerNotificationParams extends BaseNotificationParams {
  userType: 'owner';
  ownerEmail: string;
  bagIds: string[];
  context: MessageContext;
  names: NameInfo;
}

export interface FinderNotificationParams extends BaseNotificationParams {
  userType: 'finder';
  finderEmail: string;
  context: MessageContext;
  names: NameInfo;
}

export type NotificationParams =
  | OwnerNotificationParams
  | FinderNotificationParams;

export interface ConversationResolvedParams {
  finderEmail: string;
  conversationId: string;
  names: NameInfo;
}

export interface BagCreatedParams {
  email: string;
  bagName?: string;
  shortId: string;
  bagUrl: string;
}

export interface ReissueParams {
  userType: UserType;
  email: string;
  magicLinkToken: string;
  conversationId?: string;
  bagIds?: string[];
}
