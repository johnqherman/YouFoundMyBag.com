import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SuccessIcon } from '../components/icons/AppIcons.js';
import LoadingSpinner from '../components/LoadingSpinner.js';
import { TIME_MS as t } from '../constants/timeConstants.js';
import type { EmailPreferences } from '../types/index.js';

export default function EmailPreferencesPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
    setError(null);
    setSuccess(false);

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
      setSuccess(true);

      setTimeout(() => setSuccess(false), t.THREE_SECONDS);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update preferences'
      );
    } finally {
      setSaving(false);
    }
  }

  async function unsubscribeAll() {
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/email-preferences/${token}/unsubscribe`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to unsubscribe');
      }

      const data = await response.json();
      setPreferences(data.data);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Helmet>
          <title>Error | YouFoundMyBag.com</title>
        </Helmet>
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-regal-navy-900 mb-4">
            Error Loading Preferences
          </h1>
          <p className="text-regal-navy-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-6 sm:py-12 px-4">
      <Helmet>
        <title>Email Preferences | YouFoundMyBag.com</title>
      </Helmet>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-regal-navy-900 mb-2">
            Email Preferences
          </h1>
          <p className="text-sm sm:text-base text-regal-navy-600 mb-4 sm:mb-6 break-words">
            Manage your email notifications for{' '}
            <strong className="break-all">{preferences?.email}</strong>
          </p>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
              <SuccessIcon size="medium" color="currentColor" />
              <span>Your preferences have been updated successfully!</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="pb-6 border-b border-regal-navy-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.all_emails_enabled ?? true}
                  onChange={(e) =>
                    savePreferences({ all_emails_enabled: e.target.checked })
                  }
                  disabled={saving}
                  className="mt-1 w-5 h-5 text-blue-600 border-regal-navy-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-regal-navy-900">
                    Receive all emails
                  </div>
                  <div className="text-sm text-regal-navy-600 mt-1">
                    Turn this off to stop receiving all emails from
                    YouFoundMyBag
                  </div>
                </div>
              </label>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-regal-navy-900">Email Types</h3>

              <label
                className={`flex items-start gap-3 cursor-pointer ${
                  !preferences?.all_emails_enabled
                    ? 'opacity-50 pointer-events-none'
                    : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={preferences?.bag_created_enabled ?? true}
                  onChange={(e) =>
                    savePreferences({ bag_created_enabled: e.target.checked })
                  }
                  disabled={saving || !preferences?.all_emails_enabled}
                  className="mt-1 w-5 h-5 text-blue-600 border-regal-navy-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-regal-navy-900">
                    Bag creation confirmations
                  </div>
                  <div className="text-sm text-regal-navy-600 mt-1">
                    Receive confirmation emails when you create a new bag tag
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 cursor-pointer ${
                  !preferences?.all_emails_enabled
                    ? 'opacity-50 pointer-events-none'
                    : ''
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
                  className="mt-1 w-5 h-5 text-blue-600 border-regal-navy-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-regal-navy-900">
                    New conversation notifications
                  </div>
                  <div className="text-sm text-regal-navy-600 mt-1">
                    Get notified when someone finds your bag and starts a
                    conversation
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 cursor-pointer ${
                  !preferences?.all_emails_enabled
                    ? 'opacity-50 pointer-events-none'
                    : ''
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
                  className="mt-1 w-5 h-5 text-blue-600 border-regal-navy-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-regal-navy-900">
                    Reply notifications
                  </div>
                  <div className="text-sm text-regal-navy-600 mt-1">
                    Receive notifications when someone replies to your messages
                  </div>
                </div>
              </label>
            </div>

            <div className="pt-6 border-t border-regal-navy-200">
              <button
                onClick={unsubscribeAll}
                disabled={saving || !preferences?.all_emails_enabled}
                className="text-red-600 hover:text-red-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Unsubscribe from all emails
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-regal-navy-200">
            <p className="text-sm text-regal-navy-600">
              Need help? Contact us at{' '}
              <a
                href="mailto:support@youfoundmybag.com"
                className="text-blue-600 hover:underline"
              >
                support@youfoundmybag.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
