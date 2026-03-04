import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { logger } from '../../infrastructure/logger/index.js';
import { config } from '../../infrastructure/config/index.js';
import { extractBearerToken } from '../auth/utils.js';
import { verifyOwnerSession } from '../auth/service.js';
import { hashForLookup } from '../../infrastructure/security/encryption.js';
import * as billingService from './service.js';

const router = Router();

const checkoutSchema = z.object({
  billing_period: z.enum(['monthly', 'annual']),
});

const guestCheckoutSchema = z.object({
  email: z.string().email(),
  billing_period: z.enum(['monthly', 'annual']),
});

router.post('/checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const session = await verifyOwnerSession(token);
    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    const bodyResult = checkoutSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'billing_period must be "monthly" or "annual"',
      });
      return;
    }

    const emailHash = hashForLookup(session.email);
    const result = await billingService.createCheckoutSession({
      email: session.email,
      emailHash,
      billingPeriod: bodyResult.data.billing_period,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
});

router.post(
  '/checkout-guest',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const bodyResult = guestCheckoutSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Please provide a valid email and billing period',
        });
        return;
      }

      const { email, billing_period } = bodyResult.data;
      const emailHash = hashForLookup(email);

      const result = await billingService.createCheckoutSession({
        email,
        emailHash,
        billingPeriod: billing_period,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error creating guest checkout session:', error);
      res.status(500).json({
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  }
);

router.post(
  '/subscribe',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = extractBearerToken(req.headers.authorization);

      if (token) {
        const session = await verifyOwnerSession(token);
        if (!session) {
          res.status(401).json({ error: 'Invalid or expired session' });
          return;
        }

        const bodyResult = checkoutSchema.safeParse(req.body);
        if (!bodyResult.success) {
          res.status(400).json({
            error: 'Invalid request',
            message: 'billing_period must be "monthly" or "annual"',
          });
          return;
        }

        const emailHash = hashForLookup(session.email);
        const result = await billingService.createSubscriptionIntent({
          email: session.email,
          emailHash,
          billingPeriod: bodyResult.data.billing_period,
        });

        res.json({ success: true, data: result });
        return;
      }

      const bodyResult = guestCheckoutSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Please provide a valid email and billing period',
        });
        return;
      }

      const { email, billing_period } = bodyResult.data;
      const emailHash = hashForLookup(email);

      const result = await billingService.createSubscriptionIntent({
        email,
        emailHash,
        billingPeriod: billing_period,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error creating subscription intent:', error);
      res.status(500).json({
        error: 'Failed to create subscription',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  }
);

router.post('/portal', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const session = await verifyOwnerSession(token);
    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    const emailHash = hashForLookup(session.email);
    const result = await billingService.createPortalSession(emailHash);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error creating portal session:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
});

router.get(
  '/subscription',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const session = await verifyOwnerSession(token);
      if (!session) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }

      const emailHash = hashForLookup(session.email);
      const details = await billingService.getSubscriptionDetails(emailHash);

      res.json({ success: true, data: details });
    } catch (error) {
      logger.error('Error getting subscription details:', error);
      res.status(500).json({
        error: 'Failed to get subscription details',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  }
);

router.post('/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const session = await verifyOwnerSession(token);
    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    const emailHash = hashForLookup(session.email);
    const result = await billingService.cancelSubscription(emailHash);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error canceling subscription:', error);
    const message =
      error instanceof Error ? error.message : 'An error occurred';
    const status =
      message === 'Subscription is already scheduled for cancellation' ||
      message === 'No active subscription found'
        ? 400
        : 500;
    res
      .status(status)
      .json({ error: 'Failed to cancel subscription', message });
  }
});

router.post(
  '/setup-intent',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const session = await verifyOwnerSession(token);
      if (!session) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }

      const emailHash = hashForLookup(session.email);
      const result = await billingService.createSetupIntent(emailHash);

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error creating setup intent:', error);
      res.status(500).json({
        error: 'Failed to create setup intent',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  }
);

const updatePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
});

router.post(
  '/update-payment-method',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const session = await verifyOwnerSession(token);
      if (!session) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }

      const bodyResult = updatePaymentMethodSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'paymentMethodId is required',
        });
        return;
      }

      const emailHash = hashForLookup(session.email);
      await billingService.updateDefaultPaymentMethod(
        emailHash,
        bodyResult.data.paymentMethodId
      );

      res.json({ success: true });
    } catch (error) {
      logger.error('Error updating payment method:', error);
      res.status(500).json({
        error: 'Failed to update payment method',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  }
);

router.get('/plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const session = await verifyOwnerSession(token);
    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    const emailHash = hashForLookup(session.email);
    const planInfo = await billingService.resolvePlan(emailHash);

    res.json({ success: true, data: planInfo });
  } catch (error) {
    logger.error('Error getting plan info:', error);
    res.status(500).json({
      error: 'Failed to get plan info',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
});

export { router as billingRoutes };

export async function webhookHandler(
  req: Request,
  res: Response
): Promise<void> {
  const stripe = billingService.getStripe();
  if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
    res.status(500).json({ error: 'Stripe not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).json({ error: 'Missing Stripe signature' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.warn('Webhook signature verification failed', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    await billingService.handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook event:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
