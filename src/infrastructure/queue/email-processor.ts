import { Job } from 'bullmq';
import { logger } from '../logger/index.js';
import { TIME_MS as t } from '../../client/constants/timeConstants.js';
import { sendMail, getMailgunClient } from '../email/mailgun.js';
import { EmailJobData } from '../types/index.js';
import {
  recordEmailSuccess,
  recordEmailFailure,
  getCircuitBreakerState,
} from './index.js';

export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, html, type, idempotencyKey } = job.data;

  logger.info('Processing email job', {
    jobId: job.id,
    type,
    to,
    idempotencyKey,
    attempt: job.attemptsMade + 1,
  });

  const breakerState = getCircuitBreakerState();
  if (breakerState.state === 'open') {
    logger.error('Circuit breaker is open - aborting email job', {
      jobId: job.id,
      idempotencyKey,
    });
    throw new Error('Circuit breaker is open - email service unavailable');
  }

  if (!getMailgunClient()) {
    logger.warn('Mailgun not configured - skipping email job', {
      jobId: job.id,
      idempotencyKey,
    });
    return;
  }

  try {
    const sendPromise = sendMail({ to, subject, html });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Email send timeout (2s)')),
        t.TWO_SECONDS
      );
    });

    await Promise.race([sendPromise, timeoutPromise]);

    logger.info('Email job completed successfully', {
      jobId: job.id,
      type,
      to,
      idempotencyKey,
    });

    recordEmailSuccess();
  } catch (error) {
    logger.error('Email job failed', {
      jobId: job.id,
      type,
      to,
      idempotencyKey,
      attempt: job.attemptsMade + 1,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    recordEmailFailure(error instanceof Error ? error : new Error('Unknown'));

    throw error;
  }
}
