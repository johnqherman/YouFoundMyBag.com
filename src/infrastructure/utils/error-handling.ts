import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function sanitizeError(error: unknown): {
  statusCode: number;
  code: string;
  message: string;
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    };
  }

  if (error && typeof error === 'object' && 'issues' in error) {
    return {
      statusCode: 400,
      code: 'validation_error',
      message: 'Invalid input data',
    };
  }

  if (error instanceof Error) {
    logger.error('Unexpected error:', error);

    return {
      statusCode: 500,
      code: 'internal_error',
      message:
        config.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
    };
  }

  logger.error('Unknown error type:', error);
  return {
    statusCode: 500,
    code: 'internal_error',
    message: 'An unexpected error occurred',
  };
}
