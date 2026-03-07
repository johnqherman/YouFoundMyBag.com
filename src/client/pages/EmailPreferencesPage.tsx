import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LoadingSpinner from '../components/LoadingSpinner.js';
import { useToast } from '../hooks/useToast.js';
import type { EmailPreferences } from '../types/index.js';

export default function EmailPreferencesPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!token) {
      setError('Invalid preferences link');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/email-preferences/${token}`);
      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }
      const data = await response.json();
      setPreferences(data.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load preferences'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  async function savePreferences(updates: Partial<EmailPreferences>) {
    if (!token) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/email-preferences/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const data = await response.json();
      setPreferences(data.data);
      toast.success('Preferences updated successfully');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update preferences'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Helmet>
          <title>Error - YouFoundMyBag.com</title>
        </Helmet>
        <div className="card max-w-md w-full">
          <h1 className="font-display text-2xl font-semibold text-regal-navy-900 mb-3">
            Error Loading Preferences
          </h1>
          <p className="text-regal-navy-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Email Preferences - YouFoundMyBag.com</title>
      </Helmet>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-regal-navy-100/60 to-regal-navy-50/0 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 sm:pb-14 text-center">
          <div className="animate-slideUp">
            <p className="text-sm font-medium tracking-widest uppercase text-regal-navy-500 mb-5">
              Account
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-regal-navy-900 leading-[1.1] tracking-tight">
              Email Preferences
            </h1>
            <p className="mt-5 text-lg text-regal-navy-600 max-w-2xl mx-auto leading-relaxed break-words">
              Managing notifications for{' '}
              <strong className="text-regal-navy-800 break-all">
                {preferences?.email}
              </strong>
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border-t border-regal-navy-200/60 flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="animate-slideUp space-y-8">
            <div className="card">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.all_emails_enabled ?? true}
                  onChange={(e) =>
                    savePreferences({ all_emails_enabled: e.target.checked })
                  }
                  disabled={saving}
                  className="mt-0.5 w-5 h-5 text-blue-600 border-regal-navy-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-regal-navy-900">
                    Receive all emails
                  </div>
                  <div className="text-sm text-regal-navy-500 mt-1">
                    Turn this off to stop receiving all emails from
                    YouFoundMyBag
                  </div>
                </div>
              </label>
            </div>

            <div>
              <p className="text-sm font-medium tracking-widest uppercase text-regal-navy-500 mb-4">
                Email Types
              </p>
              <div className="card divide-y divide-regal-navy-100">
                <label
                  className={`flex items-start gap-4 pb-4 ${
                    !preferences?.all_emails_enabled
                      ? 'opacity-50 pointer-events-none'
                      : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={preferences?.bag_created_enabled ?? true}
                    onChange={(e) =>
                      savePreferences({ bag_created_enabled: e.target.checked })
                    }
                    disabled={saving || !preferences?.all_emails_enabled}
                    className="mt-0.5 w-5 h-5 text-blue-600 border-regal-navy-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-regal-navy-900">
                      Bag creation confirmations
                    </div>
                    <div className="text-sm text-regal-navy-500 mt-0.5">
                      Receive confirmation emails when you create a new bag tag
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-4 py-4 ${
                    !preferences?.all_emails_enabled
                      ? 'opacity-50 pointer-events-none'
                      : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={
                      preferences?.conversation_notifications_enabled ?? true
                    }
                    onChange={(e) =>
                      savePreferences({
                        conversation_notifications_enabled: e.target.checked,
                      })
                    }
                    disabled={saving || !preferences?.all_emails_enabled}
                    className="mt-0.5 w-5 h-5 text-blue-600 border-regal-navy-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-regal-navy-900">
                      New conversation notifications
                    </div>
                    <div className="text-sm text-regal-navy-500 mt-0.5">
                      Get notified when someone finds your bag and starts a
                      conversation
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-4 py-4 ${
                    !preferences?.all_emails_enabled
                      ? 'opacity-50 pointer-events-none'
                      : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={preferences?.reply_notifications_enabled ?? true}
                    onChange={(e) =>
                      savePreferences({
                        reply_notifications_enabled: e.target.checked,
                      })
                    }
                    disabled={saving || !preferences?.all_emails_enabled}
                    className="mt-0.5 w-5 h-5 text-blue-600 border-regal-navy-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-regal-navy-900">
                      Reply notifications
                    </div>
                    <div className="text-sm text-regal-navy-500 mt-0.5">
                      Receive notifications when someone replies to your
                      messages
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-4 pt-4 ${
                    !preferences?.all_emails_enabled
                      ? 'opacity-50 pointer-events-none'
                      : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={preferences?.system_updates_enabled ?? true}
                    onChange={(e) =>
                      savePreferences({
                        system_updates_enabled: e.target.checked,
                      })
                    }
                    disabled={saving || !preferences?.all_emails_enabled}
                    className="mt-0.5 w-5 h-5 text-blue-600 border-regal-navy-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-regal-navy-900">
                      System updates
                    </div>
                    <div className="text-sm text-regal-navy-500 mt-0.5">
                      Occasional emails about your account, billing, and
                      important service changes
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <p className="text-sm text-regal-navy-500 text-right">
              Need help?{' '}
              <a href="/contact" className="link">
                Contact us
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
