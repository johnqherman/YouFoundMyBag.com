import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { getRedisClient } from '../cache/index.js';
import { logger } from '../logger/index.js';
import { config } from '../config/index.js';
import {
  TIME_MS as tm,
  TIME_SECONDS as ts,
} from '../../client/constants/timeConstants.js';

export interface EmailJobData {
  type: 'magic_link_owner' | 'magic_link_finder' | 'new_message_notification';
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  conversationId?: string;
  bagShortId?: string;
}

let emailQueue: Queue<EmailJobData> | null = null;
let emailWorker: Worker<EmailJobData> | null = null;
let queueEvents: QueueEvents | null = null;

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number | null;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: null,
  state: 'closed',
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = tm.ONE_MINUTE;

export function getCircuitBreakerState(): CircuitBreakerState {
  if (
    circuitBreaker.state === 'open' &&
    circuitBreaker.lastFailureTime &&
    Date.now() - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT
  ) {
    circuitBreaker.state = 'half-open';
    logger.info('Circuit breaker transitioning to half-open state');
  }

  return { ...circuitBreaker };
}

export function recordEmailSuccess(): void {
  if (circuitBreaker.state === 'half-open') {
    circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
    if (circuitBreaker.failures <= 0) {
      circuitBreaker.state = 'closed';
      circuitBreaker.failures = 0;
      circuitBreaker.lastFailureTime = null;
      logger.info('Circuit breaker closed after successful recovery');
    }
  } else if (circuitBreaker.state === 'closed') {
    circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
  }
}

export function recordEmailFailure(error: Error): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = Date.now();

  if (
    circuitBreaker.state === 'closed' &&
    circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD
  ) {
    circuitBreaker.state = 'open';
    logger.error('Circuit breaker opened due to repeated failures', {
      failures: circuitBreaker.failures,
      error: error.message,
    });
  } else if (circuitBreaker.state === 'half-open') {
    circuitBreaker.state = 'open';
    logger.error('Circuit breaker reopened after failure in half-open state', {
      error: error.message,
    });
  }
}

export async function initializeQueues(): Promise<void> {
  logger.info('Initializing BullMQ queues...');

  const redisClient = getRedisClient();
  if (!redisClient) {
    throw new Error('Redis client not initialized - cannot create queues');
  }

  const connection = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
  };

  emailQueue = new Queue<EmailJobData>('emails', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: tm.TWO_SECONDS,
      },
      removeOnComplete: {
        age: ts.ONE_DAY,
        count: 1000,
      },
      removeOnFail: {
        age: ts.ONE_WEEK,
      },
    },
  });

  queueEvents = new QueueEvents('emails', { connection });

  queueEvents.on('completed', ({ jobId }) => {
    logger.info('Email job completed', { jobId });
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error('Email job failed', { jobId, failedReason });
  });

  logger.info('BullMQ queues initialized successfully');
}

export async function initializeWorkers(
  emailProcessor: (job: Job<EmailJobData>) => Promise<void>
): Promise<void> {
  logger.info('Initializing BullMQ workers...');

  const connection = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
  };

  emailWorker = new Worker<EmailJobData>('emails', emailProcessor, {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: tm.ONE_SECOND,
    },
  });

  emailWorker.on('completed', (job) => {
    logger.info('Worker processed email job', {
      jobId: job.id,
      type: job.data.type,
    });
  });

  emailWorker.on('failed', (job, err) => {
    logger.error('Worker failed to process email job', {
      jobId: job?.id,
      type: job?.data.type,
      error: err.message,
      attempt: job?.attemptsMade,
    });
  });

  logger.info('BullMQ workers initialized successfully');
}

export async function closeQueues(): Promise<void> {
  logger.info('Closing BullMQ queues and workers...');

  if (emailWorker) {
    await emailWorker.close();
    logger.info('Email worker closed');
  }

  if (emailQueue) {
    await emailQueue.close();
    logger.info('Email queue closed');
  }

  if (queueEvents) {
    await queueEvents.close();
    logger.info('Queue events closed');
  }

  logger.info('BullMQ shutdown complete');
}

export async function addEmailJob(
  data: EmailJobData
): Promise<Job<EmailJobData>> {
  if (!emailQueue) {
    throw new Error('Email queue not initialized');
  }

  const breakerState = getCircuitBreakerState();
  if (breakerState.state === 'open') {
    logger.warn('Circuit breaker is open - email job rejected', {
      idempotencyKey: data.idempotencyKey,
    });
    throw new Error(
      'Email service temporarily unavailable - circuit breaker is open'
    );
  }

  const job = await emailQueue.add(data.type, data, {
    jobId: data.idempotencyKey,
    removeOnComplete: true,
    removeOnFail: false,
  });

  logger.info('Email job added to queue', {
    jobId: job.id,
    type: data.type,
    idempotencyKey: data.idempotencyKey,
  });

  return job;
}

export function getEmailQueue(): Queue<EmailJobData> | null {
  return emailQueue;
}
