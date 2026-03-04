import Stripe from 'stripe';
import { config } from '../../infrastructure/config/index.js';
import { logger } from '../../infrastructure/logger/index.js';
import { hashForLookup } from '../../infrastructure/security/encryption.js';
import { cacheDel } from '../../infrastructure/cache/index.js';
import * as billingRepository from './repository.js';

const stripe = config.STRIPE_SECRET_KEY
  ? new Stripe(config.STRIPE_SECRET_KEY)
  : null;

export interface PlanInfo {
  plan: 'free' | 'pro';
  bagLimit: number;
  canEditBags: boolean;
  showBranding: boolean;
}

const FREE_PLAN: PlanInfo = {
  plan: 'free',
  bagLimit: 1,
  canEditBags: true,
  showBranding: true,
};

const PRO_PLAN: PlanInfo = {
  plan: 'pro',
  bagLimit: 10,
  canEditBags: true,
  showBranding: false,
};

export async function resolvePlan(emailHash: string): Promise<PlanInfo> {
  const plan = await billingRepository.getPlanForEmailHash(emailHash);
  return plan === 'pro' ? PRO_PLAN : FREE_PLAN;
}

export async function canCreateBag(emailHash: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount: number;
  limit: number;
}> {
  const [planInfo, currentCount] = await Promise.all([
    resolvePlan(emailHash),
    billingRepository.getBagCountForEmailHash(emailHash),
  ]);

  if (currentCount >= planInfo.bagLimit) {
    return {
      allowed: false,
      reason: `You've reached your ${planInfo.plan} plan limit of ${planInfo.bagLimit} tag${planInfo.bagLimit === 1 ? '' : 's'}.`,
      currentCount,
      limit: planInfo.bagLimit,
    };
  }

  return { allowed: true, currentCount, limit: planInfo.bagLimit };
}

export async function createCheckoutSession({
  email,
  emailHash,
  billingPeriod,
}: {
  email: string;
  emailHash: string;
  billingPeriod: 'monthly' | 'annual';
}): Promise<{ url: string }> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const priceId =
    billingPeriod === 'annual'
      ? config.STRIPE_PRO_ANNUAL_PRICE_ID
      : config.STRIPE_PRO_MONTHLY_PRICE_ID;

  if (!priceId) {
    throw new Error('Stripe price ID not configured for this billing period');
  }

  let customerId: string;
  const existingSub =
    await billingRepository.getSubscriptionByEmailHash(emailHash);

  if (existingSub?.stripe_customer_id) {
    customerId = existingSub.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email,
      metadata: { email_hash: emailHash },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${config.FRONTEND_URL}/pricing?checkout=success`,
    cancel_url: `${config.FRONTEND_URL}/pricing?checkout=cancel`,
    metadata: { email_hash: emailHash },
  });

  await billingRepository.upsertSubscription({
    owner_email_hash: emailHash,
    stripe_customer_id: customerId,
    billing_period: billingPeriod,
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session');
  }

  return { url: session.url };
}

export async function createSubscriptionIntent({
  email,
  emailHash,
  billingPeriod,
}: {
  email: string;
  emailHash: string;
  billingPeriod: 'monthly' | 'annual';
}): Promise<{ clientSecret: string; subscriptionId: string }> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const priceId =
    billingPeriod === 'annual'
      ? config.STRIPE_PRO_ANNUAL_PRICE_ID
      : config.STRIPE_PRO_MONTHLY_PRICE_ID;

  if (!priceId) {
    throw new Error('Stripe price ID not configured for this billing period');
  }

  let customerId: string;
  const existingSub =
    await billingRepository.getSubscriptionByEmailHash(emailHash);

  if (existingSub?.stripe_customer_id) {
    customerId = existingSub.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email,
      metadata: { email_hash: emailHash },
    });
    customerId = customer.id;
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { payment_method_types: ['card'] },
    metadata: { email_hash: emailHash },
  });

  const latestInvoice = subscription.latest_invoice;
  if (!latestInvoice) {
    throw new Error('No invoice created for subscription');
  }

  const invoiceId =
    typeof latestInvoice === 'string' ? latestInvoice : latestInvoice.id;

  const invoicePayments = await stripe.invoicePayments.list({
    invoice: invoiceId,
    expand: ['data.payment.payment_intent'],
  });

  const defaultPayment = invoicePayments.data.find((p) => p.is_default);
  const rawPaymentIntent = defaultPayment?.payment?.payment_intent;

  if (!rawPaymentIntent || typeof rawPaymentIntent === 'string') {
    throw new Error('Payment intent not found for invoice');
  }

  const clientSecret = rawPaymentIntent.client_secret;
  if (!clientSecret) {
    throw new Error('Payment intent has no client secret');
  }

  await billingRepository.upsertSubscription({
    owner_email_hash: emailHash,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    billing_period: billingPeriod,
    status: 'incomplete',
  });

  return {
    clientSecret,
    subscriptionId: subscription.id,
  };
}

export async function createPortalSession(
  emailHash: string
): Promise<{ url: string }> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const sub = await billingRepository.getSubscriptionByEmailHash(emailHash);
  if (!sub?.stripe_customer_id) {
    throw new Error('No subscription found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${config.FRONTEND_URL}/dashboard`,
  });

  return { url: session.url };
}

async function notifyDiscord(content: string): Promise<void> {
  const url = config.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    logger.warn('Failed to send Discord notification', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') break;

      const emailHash = session.metadata?.email_hash;
      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

      if (!emailHash || !customerId) {
        logger.warn('Checkout session missing metadata', {
          sessionId: session.id,
        });
        break;
      }

      await billingRepository.upsertSubscription({
        owner_email_hash: emailHash,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId || undefined,
        plan: 'pro',
        status: 'active',
      });

      await invalidateCachesForEmail(emailHash);
      logger.info('Checkout completed, plan set to pro', { emailHash });
      await notifyDiscord(
        `**New Pro subscription!** Customer \`${customerId}\` completed checkout.`
      );
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const status = mapStripeStatus(subscription.status);

      const subAny = subscription as unknown as Record<string, unknown>;
      const periodStart =
        typeof subAny.current_period_start === 'number'
          ? new Date(subAny.current_period_start * 1000)
          : undefined;
      const periodEnd =
        typeof subAny.current_period_end === 'number'
          ? new Date(subAny.current_period_end * 1000)
          : undefined;

      const updated = await billingRepository.updateSubscriptionByStripeId(
        subscription.id,
        {
          status,
          plan: status === 'canceled' ? 'free' : 'pro',
          ...(periodStart && { current_period_start: periodStart }),
          ...(periodEnd && { current_period_end: periodEnd }),
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : null,
        }
      );

      if (updated) {
        await invalidateCachesForEmail(updated.owner_email_hash);
        logger.info('Subscription updated', {
          subscriptionId: subscription.id,
          status,
        });
        await notifyDiscord(
          `**Subscription updated** \`${subscription.id}\` → status: \`${status}\``
        );
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      const updated = await billingRepository.updateSubscriptionByStripeId(
        subscription.id,
        {
          plan: 'free',
          status: 'canceled',
          canceled_at: new Date(),
        }
      );

      if (updated) {
        await invalidateCachesForEmail(updated.owner_email_hash);
        logger.info('Subscription deleted, reverted to free', {
          subscriptionId: subscription.id,
        });
        await notifyDiscord(
          `**Subscription canceled** \`${subscription.id}\` — reverted to free plan.`
        );
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceAny = invoice as unknown as Record<string, unknown>;
      const rawSub = invoiceAny.subscription;
      const subscriptionId =
        typeof rawSub === 'string'
          ? rawSub
          : (rawSub as { id?: string } | null)?.id;

      if (subscriptionId) {
        const updated = await billingRepository.updateSubscriptionByStripeId(
          subscriptionId,
          { status: 'past_due' }
        );

        if (updated) {
          await invalidateCachesForEmail(updated.owner_email_hash);
          logger.warn('Payment failed, subscription past_due', {
            subscriptionId,
          });
          await notifyDiscord(
            `**Payment failed** for subscription \`${subscriptionId}\` — marked past_due.`
          );
        }
      }
      break;
    }

    default:
      logger.debug('Unhandled webhook event type', { type: event.type });
  }
}

export async function invalidateCachesForEmail(
  emailHash: string
): Promise<void> {
  await cacheDel(`plan:${emailHash}`, 'plan');

  const shortIds =
    await billingRepository.getBagShortIdsForEmailHash(emailHash);

  const cacheKeys = shortIds.flatMap((shortId) => [
    `bag:finder:${shortId}`,
    `bag:short:${shortId}`,
  ]);

  if (cacheKeys.length > 0) {
    await cacheDel(cacheKeys, 'billing_invalidation');
  }
}

export async function getSubscriptionDetails(emailHash: string): Promise<{
  plan: 'free' | 'pro';
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
  billing_period: 'monthly' | 'annual' | null;
  current_period_end: string | null;
  canceled_at: string | null;
}> {
  const sub = await billingRepository.getSubscriptionByEmailHash(emailHash);
  if (!sub) {
    return {
      plan: 'free',
      status: null,
      billing_period: null,
      current_period_end: null,
      canceled_at: null,
    };
  }
  return {
    plan: sub.plan,
    status: sub.status,
    billing_period: sub.billing_period,
    current_period_end: sub.current_period_end
      ? sub.current_period_end.toISOString()
      : null,
    canceled_at: sub.canceled_at ? sub.canceled_at.toISOString() : null,
  };
}

export async function cancelSubscription(emailHash: string): Promise<{
  canceled_at: string;
  current_period_end: string | null;
}> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const sub = await billingRepository.getSubscriptionByEmailHash(emailHash);
  if (!sub?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  if (sub.canceled_at) {
    throw new Error('Subscription is already scheduled for cancellation');
  }

  const updatedStripe = await stripe.subscriptions.update(
    sub.stripe_subscription_id,
    { cancel_at_period_end: true }
  );

  const canceledAt = new Date();
  await billingRepository.updateSubscriptionByStripeId(
    sub.stripe_subscription_id,
    { canceled_at: canceledAt }
  );

  await invalidateCachesForEmail(emailHash);

  const updatedAny = updatedStripe as unknown as Record<string, unknown>;
  const periodEnd =
    typeof updatedAny.current_period_end === 'number'
      ? new Date(updatedAny.current_period_end * 1000).toISOString()
      : sub.current_period_end
        ? sub.current_period_end.toISOString()
        : null;

  return {
    canceled_at: canceledAt.toISOString(),
    current_period_end: periodEnd,
  };
}

export async function createSetupIntent(
  emailHash: string
): Promise<{ clientSecret: string }> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const sub = await billingRepository.getSubscriptionByEmailHash(emailHash);
  if (!sub?.stripe_customer_id) {
    throw new Error('No subscription found');
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: sub.stripe_customer_id,
    payment_method_types: ['card'],
    usage: 'off_session',
  });

  if (!setupIntent.client_secret) {
    throw new Error('Failed to create setup intent');
  }

  return { clientSecret: setupIntent.client_secret };
}

export async function updateDefaultPaymentMethod(
  emailHash: string,
  paymentMethodId: string
): Promise<void> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const sub = await billingRepository.getSubscriptionByEmailHash(emailHash);
  if (!sub?.stripe_customer_id) {
    throw new Error('No subscription found');
  }

  await stripe.customers.update(sub.stripe_customer_id, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  if (sub.stripe_subscription_id) {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      default_payment_method: paymentMethodId,
    });
  }
}

export async function getSubscriptionStatus(emailHash: string) {
  const sub = await billingRepository.getSubscriptionByEmailHash(emailHash);
  return sub?.status || null;
}

export function getStripe(): Stripe | null {
  return stripe;
}

function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'past_due' | 'canceled' | 'incomplete' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
      return 'canceled';
    default:
      return 'incomplete';
  }
}
