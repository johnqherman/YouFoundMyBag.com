import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '../utils/api.js';
import { CheckIcon, CrossIcon } from '../components/icons/AppIcons.js';
import PaymentModal from '../components/PaymentModal.js';

const freeFeatures = [
  { text: '1 active QR tag', included: true },
  { text: 'Anonymous two-way messaging', included: true },
  { text: 'Instant email notifications', included: true },
  { text: 'Privacy-protected contact relay', included: true },
  { text: 'Basic QR code design', included: true },
];

const freeLimits = [
  'Single tag only',
  'No QR customization',
  'Branding displayed on finder page',
];

const proFeatures = [
  { text: 'Up to 10 active QR tags', included: true },
  { text: 'Unlimited bag name changes', included: true },
  { text: 'Per-bag owner names', included: true },
  {
    text: 'Custom QR colors',
    included: true,
    detail: 'Gradient presets or any hex color',
  },
  { text: 'Custom finder page theme', included: true },
  { text: 'No branding on finder page', included: true },
];

const comparisonRows = [
  { label: 'Active QR tags', free: '1', pro: 'Up to 10' },
  { label: 'Bag name updates', free: 'Once per week', pro: 'Unlimited' },
  { label: 'QR colors', free: '\u2014', pro: 'Custom gradients' },
  {
    label: 'Finder page branding',
    free: 'YouFoundMyBag branded',
    pro: 'No branding',
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(
    null
  );
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [proSuccess, setProSuccess] = useState(false);
  const [searchParams] = useSearchParams();

  const checkoutResult = searchParams.get('checkout');

  useEffect(() => {
    const token = localStorage.getItem('owner_session_token');
    if (token) {
      api
        .getPlan(token)
        .then((res) => setCurrentPlan(res.data.plan))
        .catch(() => {});
    }
  }, []);

  const proPrice = isAnnual ? '$45' : '$5';
  const proPeriod = isAnnual ? '/year' : '/mo';
  const savingsNote = isAnnual ? 'Save $15 vs. monthly' : '$45/year — save $15';

  const handleProCheckout = async () => {
    setCheckoutError(null);
    setCheckoutLoading(true);

    const billingPeriod = isAnnual ? 'annual' : 'monthly';
    const token = localStorage.getItem('owner_session_token');

    try {
      let result;
      if (token) {
        result = await api.createSubscriptionIntent(billingPeriod, token);
      } else {
        if (!showEmailInput) {
          setShowEmailInput(true);
          setCheckoutLoading(false);
          return;
        }
        if (!checkoutEmail.trim()) {
          setCheckoutError('Please enter your email address.');
          setCheckoutLoading(false);
          return;
        }
        result = await api.createSubscriptionIntent(
          billingPeriod,
          checkoutEmail.trim(),
          true
        );
      }
      setPaymentClientSecret(result.data.clientSecret);
      setPaymentModalOpen(true);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : 'Failed to start checkout'
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    setPaymentClientSecret(null);
    setCurrentPlan('pro');
    setProSuccess(true);
  };

  return (
    <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
      <Helmet>
        <title>Pricing - YouFoundMyBag.com</title>
        <meta
          name="description"
          content="Simple, transparent pricing. Start free with one QR tag, or upgrade to Pro for more tags and custom QR codes."
        />
      </Helmet>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-regal-navy-100/60 to-regal-navy-50/0 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 sm:pb-14 text-center">
          <div className="animate-slideUp">
            <p className="text-sm font-medium tracking-widest uppercase text-regal-navy-500 mb-5">
              Pricing
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-regal-navy-900 leading-[1.1] tracking-tight">
              Start free. Upgrade when you need more.
            </h1>
            <p className="mt-5 text-lg text-regal-navy-600 max-w-2xl mx-auto leading-relaxed">
              One tag is all most people need. When you&apos;re ready for more,
              Pro gives you custom QR codes, more tags, and room to grow.
            </p>

            <div className="mt-10 inline-flex items-center gap-3 bg-white border border-regal-navy-200 rounded-full px-1.5 py-1.5 shadow-soft billing-toggle">
              <button
                onClick={() => setIsAnnual(false)}
                className={`relative px-5 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  !isAnnual
                    ? 'text-white'
                    : 'text-regal-navy-600 hover:text-regal-navy-800'
                }`}
              >
                {!isAnnual && (
                  <motion.div
                    layoutId="billing-pill"
                    className="absolute inset-0 bg-regal-navy-800 rounded-full shadow-soft-md"
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                )}
                <span className="relative">Monthly</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`relative px-5 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                    isAnnual
                      ? 'text-white'
                      : 'text-regal-navy-600 hover:text-regal-navy-800'
                  }`}
                >
                  {isAnnual && (
                    <motion.div
                      layoutId="billing-pill"
                      className="absolute inset-0 bg-regal-navy-800 rounded-full shadow-soft-md"
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    />
                  )}
                  <span className="relative">Annual</span>
                </button>
                <span
                  className={`recommended-badge absolute -top-2.5 -right-2 text-xs px-1.5 py-0.5 rounded-full font-semibold pointer-events-none transition-colors duration-200 ${
                    isAnnual
                      ? 'bg-medium-jungle-500 text-white'
                      : 'bg-medium-jungle-100 text-medium-jungle-700'
                  }`}
                >
                  Save 25%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {(checkoutResult === 'success' || proSuccess) && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 mb-6">
          <div className="bg-medium-jungle-50 border border-medium-jungle-200 rounded-lg px-5 py-4 text-medium-jungle-800 text-sm text-center">
            Your Pro subscription is active! You can now create up to 10 tags
            and access all Pro features.
          </div>
        </div>
      )}
      {checkoutResult === 'cancel' && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 mb-6">
          <div className="bg-saffron-50 border border-saffron-200 rounded-lg px-5 py-4 text-saffron-800 text-sm text-center">
            Checkout was canceled. You can try again whenever you&apos;re ready.
          </div>
        </div>
      )}

      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="animate-slideUp">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            <div className="bg-white border border-regal-navy-200/60 rounded-2xl p-6 sm:p-8 flex flex-col">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-regal-navy-700 mb-1">
                  Free
                </h2>
                <p className="text-regal-navy-500 text-sm">
                  Perfect for a single item
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl text-regal-navy-900">
                    $0
                  </span>
                </div>
                <p className="text-regal-navy-500 text-sm mt-1">Free forever</p>
              </div>

              <Link
                to="/new"
                className="btn-secondary text-center text-sm mb-8"
              >
                Get started
              </Link>

              <div className="border-t border-regal-navy-100 pt-6 flex-1">
                <p className="text-xs font-medium tracking-wider uppercase text-regal-navy-400 mb-4">
                  Includes
                </p>
                <ul className="space-y-3">
                  {freeFeatures.map((feature) => (
                    <li
                      key={feature.text}
                      className="flex items-start gap-3 text-sm text-regal-navy-700"
                    >
                      <span className="mt-0.5 text-medium-jungle-500 shrink-0">
                        <CheckIcon />
                      </span>
                      {feature.text}
                    </li>
                  ))}
                </ul>

                <p className="text-xs font-medium tracking-wider uppercase text-regal-navy-400 mt-8 mb-4">
                  Limits
                </p>
                <ul className="space-y-3">
                  {freeLimits.map((limit) => (
                    <li
                      key={limit}
                      className="flex items-start gap-3 text-sm text-regal-navy-500"
                    >
                      <span className="mt-0.5 text-regal-navy-300 shrink-0">
                        <CrossIcon />
                      </span>
                      {limit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="relative bg-regal-navy-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col shadow-soft-lg">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-regal-navy-200 mb-1">
                  ✦ Pro
                </h2>
                <p className="text-regal-navy-400 text-sm">
                  For frequent travelers & multiple items
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl text-white">
                    {proPrice}
                  </span>
                  <span className="text-regal-navy-400 text-lg">
                    {proPeriod}
                  </span>
                </div>
                <p className="text-regal-navy-400 text-sm mt-1">
                  {savingsNote}
                </p>
              </div>

              <div className="mb-8 space-y-3">
                {currentPlan === 'pro' ? (
                  <>
                    <div className="w-full bg-medium-jungle-500/20 text-medium-jungle-300 font-medium py-3 px-4 sm:py-2.5 sm:px-5 rounded-lg text-center text-sm border border-medium-jungle-500/30">
                      You're on Pro
                    </div>
                    <Link
                      to="/dashboard"
                      className="block w-full bg-white hover:bg-regal-navy-100 active:bg-regal-navy-200 text-regal-navy-900 font-medium py-3 px-4 sm:py-2.5 sm:px-5 rounded-lg shadow-soft transition-all duration-150 min-h-[44px] text-center text-sm"
                    >
                      Go to dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    {showEmailInput &&
                      !localStorage.getItem('owner_session_token') && (
                        <input
                          type="email"
                          value={checkoutEmail}
                          onChange={(e) => setCheckoutEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="w-full px-4 py-2.5 rounded-lg text-sm text-regal-navy-900 border border-regal-navy-300 focus:outline-none focus:ring-2 focus:ring-white/50"
                        />
                      )}
                    <button
                      onClick={handleProCheckout}
                      disabled={checkoutLoading}
                      className="w-full bg-white hover:bg-regal-navy-100 active:bg-regal-navy-200 text-regal-navy-900 font-medium py-3 px-4 sm:py-2.5 sm:px-5 rounded-lg shadow-soft transition-all duration-150 min-h-[44px] text-center text-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-regal-navy-900 disabled:opacity-50"
                    >
                      {checkoutLoading ? 'Loading...' : 'Start with Pro'}
                    </button>
                    {checkoutError && (
                      <p className="text-sm text-cinnabar-400">
                        {checkoutError}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-regal-navy-700/60 pt-6 flex-1">
                <p className="text-xs font-medium tracking-wider uppercase text-regal-navy-500 mb-4">
                  Everything in Free, plus
                </p>
                <ul className="space-y-3">
                  {proFeatures.map((feature) => (
                    <li
                      key={feature.text}
                      className="flex items-start gap-3 text-sm text-regal-navy-200"
                    >
                      <span className="mt-0.5 text-medium-jungle-400 shrink-0">
                        <CheckIcon />
                      </span>
                      <span>
                        {feature.text}
                        {feature.detail && (
                          <span className="block text-regal-navy-400 text-xs mt-0.5">
                            {feature.detail}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-regal-navy-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl text-regal-navy-900 tracking-tight">
              Compare plans
            </h2>
            <p className="mt-3 text-regal-navy-600 text-lg">
              See what&apos;s included at a glance.
            </p>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b-2 border-regal-navy-200">
                  <th className="text-left font-medium text-regal-navy-500 py-4 pr-4 pl-4 sm:pl-0 w-2/5">
                    Feature
                  </th>
                  <th className="text-center font-medium text-regal-navy-500 py-4 px-4 w-[30%]">
                    Free
                  </th>
                  <th className="text-center font-semibold text-regal-navy-900 py-4 px-4 pl-4 sm:pr-0 w-[30%]">
                    ✦ Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={
                      i < comparisonRows.length - 1
                        ? 'border-b border-regal-navy-100'
                        : ''
                    }
                  >
                    <td className="py-4 pr-4 pl-4 sm:pl-0 text-regal-navy-700 font-medium">
                      {row.label}
                    </td>
                    <td className="py-4 px-4 text-center text-regal-navy-500">
                      {row.free}
                    </td>
                    <td className="py-4 px-4 pl-4 sm:pr-0 text-center text-regal-navy-900 font-medium">
                      {row.pro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-regal-navy-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="font-display text-2xl sm:text-4xl text-regal-navy-900 tracking-tight">
            Protect what matters to you.
          </h2>
          <p className="mt-5 text-regal-navy-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Create your first QR tag in seconds — no account required. Your
            personal information is never shared with finders.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/new" className="btn-primary text-base px-8">
              Create your first tag for free
            </Link>
          </div>
        </div>
      </section>

      {paymentModalOpen && paymentClientSecret && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setPaymentClientSecret(null);
          }}
          clientSecret={paymentClientSecret}
          billingPeriod={isAnnual ? 'annual' : 'monthly'}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
