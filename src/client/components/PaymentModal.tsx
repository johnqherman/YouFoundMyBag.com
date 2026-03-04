import { useState } from 'react';
import { useScrollLock } from '../hooks/useScrollLock.js';
import { useEscapeKey } from '../hooks/useEscapeKey.js';
import { useModalBackdrop } from '../hooks/useModalBackdrop.js';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

interface PaymentFormProps {
  billingPeriod: 'monthly' | 'annual';
  onSuccess: () => void;
  onClose: () => void;
}

function PaymentForm({ billingPeriod, onSuccess, onClose }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const returnUrl = `${window.location.origin}/pricing?checkout=success`;

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess();
      return;
    }

    setLoading(false);
  };

  const proPrice = billingPeriod === 'annual' ? '$45/year' : '$5/month';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-regal-navy-400 text-sm mb-4">
          Pro plan &mdash; {proPrice}
        </p>
        <div className="relative min-h-[268px]">
          {!ready && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-24 rounded bg-regal-navy-700 animate-pulse" />
                <div className="h-10 rounded-lg bg-regal-navy-800 animate-pulse" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 w-24 rounded bg-regal-navy-700 animate-pulse" />
                  <div className="h-10 rounded-lg bg-regal-navy-800 animate-pulse" />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 w-20 rounded bg-regal-navy-700 animate-pulse" />
                  <div className="h-10 rounded-lg bg-regal-navy-800 animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-16 rounded bg-regal-navy-700 animate-pulse" />
                <div className="h-10 rounded-lg bg-regal-navy-800 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-16 rounded bg-regal-navy-700 animate-pulse" />
                <div className="h-10 rounded-lg bg-regal-navy-800 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="h-2 rounded bg-regal-navy-700 animate-pulse" />
                <div className="h-2 rounded bg-regal-navy-700 animate-pulse" />
                <div className="h-2 w-3/4 rounded bg-regal-navy-700 animate-pulse" />
              </div>
            </div>
          )}
          <div className={!ready ? 'absolute inset-0' : ''}>
            <PaymentElement
              options={{ layout: 'tabs', wallets: { link: 'never' } }}
              onReady={() => setReady(true)}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-cinnabar-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-2.5 px-4 rounded-lg border border-regal-navy-700 text-regal-navy-300 text-sm font-medium hover:bg-regal-navy-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !stripe || !elements || !ready}
          className="flex-1 py-2.5 px-4 rounded-lg bg-white text-regal-navy-900 text-sm font-medium hover:bg-regal-navy-100 active:bg-regal-navy-200 transition-colors shadow-soft disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-regal-navy-900"
        >
          {loading ? 'Processing...' : 'Subscribe'}
        </button>
      </div>
    </form>
  );
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string;
  billingPeriod: 'monthly' | 'annual';
  onSuccess: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  clientSecret,
  billingPeriod,
  onSuccess,
}: PaymentModalProps) {
  useScrollLock(isOpen);
  useEscapeKey(isOpen, onClose);
  const backdropProps = useModalBackdrop(onClose);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-regal-navy-900/70 dark:bg-white/70 backdrop-blur-sm"
        {...backdropProps}
      />
      <div className="payment-modal-card relative w-full max-w-md bg-regal-navy-900 border border-regal-navy-700 rounded-2xl p-6 sm:p-8 shadow-soft-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Upgrade to Pro</h2>
          <button
            onClick={onClose}
            className="text-regal-navy-400 hover:text-regal-navy-200 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#ffffff',
                colorBackground: '#0f1a2e',
                colorText: '#e2e8f0',
                colorDanger: '#f87171',
                borderRadius: '8px',
              },
            },
          }}
        >
          <PaymentForm
            billingPeriod={billingPeriod}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        </Elements>
      </div>
    </div>
  );
}
