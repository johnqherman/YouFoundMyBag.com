import { validate } from 'deep-email-validator';
import { z } from 'zod';
import { Response, NextFunction } from 'express';
import { logger } from '../logger/index.js';
import {
  EmailValidationResult,
  EmailValidationOptions,
  RequestWithEmailValidation,
} from '../types/index.js';

export async function isValidEmail(email: string): Promise<boolean> {
  const result = await validateEmail(email);
  return result.valid;
}

export async function validateEmail(
  email: string
): Promise<EmailValidationResult> {
  const result: EmailValidationResult = {
    valid: false,
    warnings: [],
    details: {
      syntaxValid: false,
      mxRecords: null,
      disposableEmail: null,
      typoDetected: null,
    },
  };

  try {
    const deepValidation = await validate({
      email,
      validateRegex: false,
      validateTypo: false,
      validateSMTP: false,
    });

    result.details.syntaxValid =
      deepValidation.validators.regex?.valid ?? false;
    result.details.mxRecords = deepValidation.validators.mx?.valid ?? null;
    result.details.disposableEmail =
      deepValidation.validators.disposable?.valid ?? null;

    result.valid =
      result.details.syntaxValid &&
      result.details.mxRecords !== false &&
      result.details.disposableEmail !== false;

    if (result.details.disposableEmail === false) {
      result.warnings.push('Temporary or disposable emails cannot be used');
    } else if (!result.valid) {
      result.warnings.push('Please enter a valid email address');
    }

    return result;
  } catch (error) {
    logger.error(`Email validation error for ${email}:`, error);
    result.warnings.push('Email validation service error');
    return result;
  }
}

export const emailValidationSchema = z.string().refine(
  async (email) => {
    try {
      return await isValidEmail(email);
    } catch (error) {
      logger.warn(
        'Email validation check failed, falling back to basic validation:',
        error
      );
      return typeof email === 'string' && email.length > 0;
    }
  },
  { message: 'Please enter a valid email address' }
);

export const emailValidationMiddleware = (
  options: EmailValidationOptions = {}
): ((
  req: RequestWithEmailValidation,
  res: Response,
  next: NextFunction
) => Promise<void>) => {
  const { fields = ['email'] } = options;

  return async (
    req: RequestWithEmailValidation,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const emailValidationResults: Record<string, EmailValidationResult> = {};

      for (const field of fields) {
        const email = req.body[field];

        if (email && typeof email === 'string') {
          const result = await validateEmail(email);

          emailValidationResults[field] = result;

          if (!result.valid) {
            const userFriendlyMessage =
              result.warnings.length > 0
                ? result.warnings.join('. ')
                : 'Please enter a valid email address';

            res.status(400).json({
              error: 'validation_error',
              message: userFriendlyMessage,
            });
            return;
          }

          if (result.warnings.length > 0) {
            logger.warn(
              `Email validation warnings for ${field} (${email}):`,
              result.warnings
            );
          }
        }
      }

      req.emailValidation = emailValidationResults;

      return next();
    } catch (error) {
      logger.error('Email validation middleware error:', error);
      res.status(500).json({
        error: 'Email validation service error',
        message: 'Unable to validate email addresses',
      });
      return;
    }
  };
};
