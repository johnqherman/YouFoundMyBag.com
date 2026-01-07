import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { logger } from '../logger/index.js';

const window = new JSDOM('').window;
const purify = DOMPurify(window as unknown as Window & typeof globalThis);

export function sanitizeForEmail(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  sanitized = sanitized.replace(/<br\s*\/?>/gi, '\n');

  sanitized = escapeHtml(sanitized);

  sanitized = sanitized.replace(/\n\s*\n\s*\n/g, '\n\n');
  sanitized = sanitized.trim();

  return sanitized;
}

export function sanitizeForEmailStrict(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  sanitized = sanitized.replace(/<br\s*\/?>/gi, '\n');

  sanitized = purify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  sanitized = sanitized.replace(/\n\s*\n\s*\n/g, '\n\n');
  sanitized = sanitized.trim();

  return sanitized;
}

export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function validateEmailContent(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return true;
  }

  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:\s*text\/html/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i,
    /<style/i,
    /expression\s*\(/i,
    /url\s*\(\s*javascript:/i,
  ];

  return !suspiciousPatterns.some((pattern) => pattern.test(input));
}

export function secureEmailContent(input: string): {
  content: string;
  wasSanitized: boolean;
  isValid: boolean;
} {
  if (!input || typeof input !== 'string') {
    return {
      content: '',
      wasSanitized: false,
      isValid: true,
    };
  }

  const isValid = validateEmailContent(input);
  const sanitized = sanitizeForEmail(input);
  const wasSanitized = sanitized !== input;

  if (!isValid || wasSanitized) {
    logger.warn('Email content sanitized', {
      originalLength: input.length,
      sanitizedLength: sanitized.length,
      wasSanitized,
      isValid,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    content: sanitized,
    wasSanitized,
    isValid,
  };
}
