import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../hooks/useScrollLock.js';
import ConfirmModal from './ConfirmModal.js';
import UpdatePaymentMethodModal from './UpdatePaymentMethodModal.js';
import { BagSettingsIcon } from './icons/AppIcons.js';
import { api } from '../utils/api.js';
import type { PlanInfo } from '../types/index.js';
import { useToast } from '../hooks/useToast.js';
import { useModalBackdrop } from '../hooks/useModalBackdrop.js';

const RETENTION_OPTIONS = [
  { value: null, label: 'Never' },
  { value: 1, label: '1 month' },
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months (default)' },
  { value: 12, label: '1 year' },
];

function RetentionSelect({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setIsOpen((o) => !o);
  };

  const selected = RETENTION_OPTIONS.find((o) => o.value === value)!;

  return (
    <div ref={ref} className="relative w-48">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
        disabled={disabled}
        className="input-field flex items-center justify-between text-left !py-1.5 !min-h-0"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selected.label}</span>
        <svg
          className={`w-4 h-4 text-regal-navy-500 shrink-0 ml-2 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <ul
            role="listbox"
            style={dropdownStyle}
            className="retention-dropdown-list bg-white border border-regal-navy-200 rounded-lg shadow-lg overflow-hidden"
          >
            {RETENTION_OPTIONS.map((opt) => (
              <li
                key={String(opt.value)}
                role="option"
                aria-selected={opt.value === value}
                onMouseDown={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`px-3 py-2.5 text-sm cursor-pointer transition-colors duration-100 ${
                  opt.value === value
                    ? 'bg-regal-navy-50 text-regal-navy-900 font-medium'
                    : 'text-regal-navy-700 hover:bg-regal-navy-50 hover:text-regal-navy-900'
                }`}
              >
                {opt.label}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}

interface SubscriptionDetails {
  plan: 'free' | 'pro';
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
  billing_period: 'monthly' | 'annual' | null;
  current_period_end: string | null;
  canceled_at: string | null;
}

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  planInfo: PlanInfo | null | undefined;
  email?: string;
  ownerName?: string;
  onSaved?: () => void;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function AccountSettingsModal({
  isOpen,
  onClose,
  planInfo,
  email,
  ownerName,
  onSaved,
}: AccountSettingsModalProps) {
  useScrollLock(isOpen);
  const { toast } = useToast();
  const backdropProps = useModalBackdrop(onClose);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(
    null
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);
  const [editingName, setEditingName] = useState(ownerName ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [retentionMonths, setRetentionMonths] = useState<number | null>(6);
  const [retentionSaving, setRetentionSaving] = useState(false);

  const loadSubscription = useCallback(async () => {
    const token = localStorage.getItem('owner_session_token');
    if (!token) return;

    setLoadingDetails(true);
    try {
      const [subResult, settingsResult] = await Promise.all([
        api.getSubscriptionDetails(token),
        api.getOwnerSettings(token),
      ]);
      setSubscription(subResult.data);
      setRetentionMonths(settingsResult.data.conversation_retention_months);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to load subscription details'
      );
    } finally {
      setLoadingDetails(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      setShowCancelConfirm(false);
      setEditingName(ownerName ?? '');
      loadSubscription();
    }
  }, [isOpen, loadSubscription, ownerName]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        isOpen &&
        !showCancelConfirm &&
        !showDeleteConfirm
      )
        onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, showCancelConfirm, showDeleteConfirm]);

  const handleCancelConfirm = async () => {
    const token = localStorage.getItem('owner_session_token');
    if (!token) return;

    setCanceling(true);
    setShowCancelConfirm(false);
    try {
      const result = await api.cancelSubscription(token);
      const periodEnd = result.data?.current_period_end
        ? formatDate(result.data.current_period_end)
        : null;
      toast.success(
        periodEnd
          ? `Subscription canceled. You'll keep access until ${periodEnd}.`
          : 'Subscription canceled successfully.'
      );
      await loadSubscription();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to cancel subscription'
      );
    } finally {
      setCanceling(false);
    }
  };

  const handleManagePayment = () => {
    setShowUpdatePayment(true);
  };

  const handleSaveName = async () => {
    const token = localStorage.getItem('owner_session_token');
    if (!token) return;
    setNameSaving(true);
    try {
      const res = await fetch('/api/auth/owner-name', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ owner_name: editingName }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Display name saved');
      onSaved?.();
    } catch {
      toast.error('Failed to update display name. Please try again.');
    } finally {
      setNameSaving(false);
    }
  };

  const handleRetentionChange = async (months: number | null) => {
    const token = localStorage.getItem('owner_session_token');
    if (!token) return;
    setRetentionMonths(months);
    setRetentionSaving(true);
    try {
      await api.updateOwnerSettings(token, {
        conversation_retention_months: months,
      });
      toast.success('Retention setting saved');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save setting'
      );
    } finally {
      setRetentionSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const token = localStorage.getItem('owner_session_token');
    if (!token) return;
    setDeleting(true);
    setShowDeleteConfirm(false);
    try {
      await api.deleteAccount(token);
      localStorage.removeItem('owner_session_token');
      window.location.href = '/';
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete account'
      );
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  const isPro = planInfo?.plan === 'pro';
  const isCanceling =
    subscription?.canceled_at !== null &&
    subscription?.canceled_at !== undefined;

  const accessEndsDate = subscription?.current_period_end
    ? formatDate(subscription.current_period_end)
    : null;

  return (
    <>
      <div
        className="modal-backdrop fixed inset-0 bg-regal-navy-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn"
        {...backdropProps}
      >
        <div
          className="modal-container bg-white sm:rounded-2xl shadow-soft-lg w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg flex flex-col overflow-hidden animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-5 border-b border-regal-navy-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-regal-navy-50 border border-regal-navy-200 flex items-center justify-center text-regal-navy-600 shrink-0">
                <BagSettingsIcon color="currentColor" />
              </div>
              <div>
                <h1 className="font-display text-lg text-regal-navy-900 leading-tight">
                  Account Settings
                </h1>
                <p className="text-xs text-regal-navy-500 mt-0.5">
                  Manage your subscription
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-1 text-regal-navy-400 hover:text-regal-navy-700 hover:bg-regal-navy-50 rounded-lg transition-all"
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

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {email && (
              <section>
                <h2 className="text-xs font-semibold text-regal-navy-500 uppercase tracking-widest mb-3">
                  Account
                </h2>
                <div className="bg-regal-navy-50 rounded-xl border border-regal-navy-200 overflow-hidden divide-y divide-regal-navy-200">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-regal-navy-600">Email</span>
                    <span className="text-sm font-medium text-regal-navy-900">
                      {email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-regal-navy-600 shrink-0">
                      Display Name
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={handleSaveName}
                        disabled={
                          nameSaving || editingName === (ownerName ?? '')
                        }
                        className="text-xs font-medium text-regal-navy-600 hover:text-regal-navy-900 disabled:opacity-0 disabled:pointer-events-none transition-all shrink-0"
                      >
                        {nameSaving ? 'Saving…' : 'Save'}
                      </button>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onFocus={(e) => {
                          const el = e.target;
                          setTimeout(
                            () =>
                              el.setSelectionRange(
                                el.value.length,
                                el.value.length
                              ),
                            0
                          );
                        }}
                        onMouseUp={(e) => {
                          const el = e.currentTarget;
                          setTimeout(
                            () =>
                              el.setSelectionRange(
                                el.value.length,
                                el.value.length
                              ),
                            0
                          );
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === 'Enter' &&
                            !nameSaving &&
                            editingName !== (ownerName ?? '')
                          )
                            handleSaveName();
                        }}
                        maxLength={30}
                        placeholder="Not set"
                        className="text-sm font-medium text-regal-navy-900 text-right bg-transparent border-b border-dashed border-regal-navy-300 hover:border-regal-navy-500 focus:border-solid focus:border-regal-navy-500 focus:outline-none py-0.5 placeholder:text-regal-navy-300 transition-colors w-36"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('owner_session_token');
                    window.location.href = '/';
                  }}
                  className="mt-2 w-full flex items-center justify-between px-4 py-3 rounded-xl border border-regal-navy-200 bg-white hover:bg-regal-navy-50 text-sm text-regal-navy-600 hover:text-regal-navy-900 transition-colors"
                >
                  Log out
                  <svg
                    className="w-4 h-4 text-regal-navy-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
                <div className="pt-1 text-center">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleting}
                    className="text-sm text-cinnabar-600 hover:text-cinnabar-800 underline underline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting…' : 'Delete account'}
                  </button>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xs font-semibold text-regal-navy-500 uppercase tracking-widest mb-3">
                Subscription
              </h2>

              {loadingDetails ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-5 bg-regal-navy-100 rounded-md animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-regal-navy-50 rounded-xl border border-regal-navy-200 divide-y divide-regal-navy-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-regal-navy-600">Plan</span>
                    {isPro ? (
                      <span className="badge bg-saffron-100 text-saffron-800 border border-saffron-300">
                        ✦ Pro
                      </span>
                    ) : (
                      <span className="badge badge-neutral">Free</span>
                    )}
                  </div>

                  {isPro && subscription && (
                    <>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-regal-navy-600">
                          Status
                        </span>
                        <span
                          className={`badge ${
                            isCanceling
                              ? 'bg-cinnabar-50 text-cinnabar-700 border border-cinnabar-200'
                              : subscription.status === 'active'
                                ? 'badge-success'
                                : subscription.status === 'past_due'
                                  ? 'badge-warning'
                                  : 'badge-neutral'
                          }`}
                        >
                          {isCanceling
                            ? 'Cancels at period end'
                            : subscription.status === 'active'
                              ? 'Active'
                              : subscription.status === 'past_due'
                                ? 'Past due'
                                : subscription.status || '—'}
                        </span>
                      </div>

                      {subscription.billing_period && (
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-regal-navy-600">
                            Billing period
                          </span>
                          <span className="text-sm font-medium text-regal-navy-900 capitalize">
                            {subscription.billing_period}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-regal-navy-600">
                          {isCanceling ? 'Access ends' : 'Renews on'}
                        </span>
                        <span className="text-sm font-medium text-regal-navy-900">
                          {formatDate(subscription.current_period_end)}
                        </span>
                      </div>
                    </>
                  )}

                  {!isPro && (
                    <div className="px-4 py-3">
                      <p className="text-sm text-regal-navy-600 leading-relaxed">
                        You&apos;re on the free plan.{' '}
                        <a href="/pricing" className="link font-medium">
                          Upgrade to Pro
                        </a>{' '}
                        to unlock more tags, editing, and no branding.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xs font-semibold text-regal-navy-500 uppercase tracking-widest mb-3">
                Data &amp; Privacy
              </h2>
              <div className="bg-regal-navy-50 rounded-xl border border-regal-navy-200">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-regal-navy-600">
                    Delete conversations after
                  </span>
                  <RetentionSelect
                    value={retentionMonths}
                    onChange={handleRetentionChange}
                    disabled={retentionSaving || loadingDetails}
                  />
                </div>
              </div>
            </section>

            {isPro && !loadingDetails && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-regal-navy-500 uppercase tracking-widest mb-3">
                  Billing
                </h2>
                <button
                  onClick={handleManagePayment}
                  className="btn-secondary w-full text-sm"
                >
                  Manage Payment Method
                </button>

                {!isCanceling && (
                  <div className="pt-1 text-center">
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={canceling}
                      className="text-sm text-cinnabar-600 hover:text-cinnabar-800 underline underline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {canceling ? 'Canceling…' : 'Cancel subscription'}
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete your account?"
        message="All your bags, conversations, and data will be permanently deleted. This cannot be undone."
        confirmText="Yes, delete my account"
        cancelText="Keep account"
        variant="danger"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        isOpen={showCancelConfirm}
        title="Cancel Pro subscription?"
        message={`You'll keep access to all Pro features until${accessEndsDate ? ` ${accessEndsDate}` : ' the end of your billing period'}. After that, your account will revert to the free plan.`}
        confirmText="Yes, cancel"
        cancelText="Keep subscription"
        variant="danger"
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelConfirm(false)}
      />

      <UpdatePaymentMethodModal
        isOpen={showUpdatePayment}
        onClose={() => setShowUpdatePayment(false)}
        onSuccess={() => {
          setShowUpdatePayment(false);
          loadSubscription();
        }}
      />
    </>
  );
}
