import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import CharacterLimitTextArea from './CharacterLimitTextArea';
import PrivacyWarning from './PrivacyWarning';
import { emailSchema } from '../../infrastructure/utils/validation';
import { lowercaseBagName } from '../../infrastructure/utils/formatting';
import { SuccessIcon } from './icons/AppIcons';

interface Props {
  shortId: string;
  ownerName?: string;
  bagName?: string;
  onClose: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (element: string, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export default function ContactModal({
  shortId,
  ownerName,
  bagName,
  onClose,
}: Props) {
  const [message, setMessage] = useState('');
  const [senderInfo, setSenderInfo] = useState('');
  const [senderName, setSenderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);

  const renderWidget = () => {
    if (window.turnstile) {
      const container = document.getElementById('turnstile-widget');
      if (container) {
        container.innerHTML = '';
      }

      const id = window.turnstile.render('#turnstile-widget', {
        sitekey:
          (import.meta as { env?: Record<string, unknown> }).env
            ?.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
        callback: (token: string) => setTurnstileToken(token),
        theme: 'light',
      });
      setWidgetId(id);
    }
  };

  const resetWidget = () => {
    if (window.turnstile) {
      if (widgetId) {
        window.turnstile.reset(widgetId);
      } else {
        window.turnstile.reset();
      }
      setTurnstileToken(null);
    }
  };

  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
    );

    if (existingScript) {
      if (window.turnstile) {
        renderWidget();
      } else {
        existingScript.addEventListener('load', renderWidget);
      }
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    }

    return () => {
      if (window.turnstile) {
        window.turnstile.reset();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken || !message.trim() || !senderInfo.trim()) {
      setError('Please complete all required fields and security verification');
      return;
    }

    const result = emailSchema.safeParse(senderInfo.trim());
    if (!result.success) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await api.startConversation(shortId, {
        finder_message: message.trim(),
        finder_email: senderInfo.trim() || undefined,
        finder_display_name: senderName.trim() || undefined,
        turnstile_token: turnstileToken,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      resetWidget();
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-regal-navy-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-soft-lg">
          <div className="text-center">
            <div
              className="mb-4 flex justify-center text-medium-jungle-700"
              style={{ fontSize: '4rem' }}
            >
              <SuccessIcon color="currentColor" />
            </div>
            <h2 className="text-2xl font-semibold text-medium-jungle-700 mb-4">
              Message Sent!
            </h2>
            <p className="text-regal-navy-700 mb-6 leading-relaxed">
              Your message has been sent to {ownerName || 'the owner'}!
              <br />
              <br />
              <strong className="text-regal-navy-900">
                Check your email ({senderInfo})
              </strong>{' '}
              for a secure link to continue the conversation. Both you and the
              owner can communicate safely through our private messaging system.
            </p>
            <button onClick={onClose} className="btn-primary w-full">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-regal-navy-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-soft-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-regal-navy-900">
            Contact {ownerName || 'Owner'}
          </h2>
          <button
            onClick={onClose}
            className="text-regal-navy-500 hover:text-regal-navy-700 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-regal-navy-800 mb-2"
            >
              Your message <span className="text-cinnabar-600">*</span>
            </label>
            <PrivacyWarning
              message="Avoid sharing personal contact details here."
              storageKey="contact-modal-privacy-tip"
              variant="light"
              className="mb-3"
            />
            <CharacterLimitTextArea
              value={message}
              onChange={setMessage}
              maxLength={300}
              placeholder={`Hi! I found your ${lowercaseBagName(bagName)}. Let me know how to return it.`}
              rows={4}
              required
              variant="light"
              className="input-field"
            />
          </div>

          <div>
            <label
              htmlFor="senderName"
              className="block text-sm font-medium text-regal-navy-800 mb-2"
            >
              Your name{' '}
              <span className="text-regal-navy-500 font-normal">
                (optional)
              </span>
            </label>
            <input
              id="senderName"
              type="text"
              placeholder="Your name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="input-field"
              maxLength={30}
            />
          </div>

          <div>
            <label
              htmlFor="senderInfo"
              className="block text-sm font-medium text-regal-navy-800 mb-2"
            >
              Your email address <span className="text-cinnabar-600">*</span>
            </label>
            <input
              id="senderInfo"
              type="email"
              placeholder="your@email.com"
              value={senderInfo}
              onChange={(e) => setSenderInfo(e.target.value)}
              className="input-field"
              maxLength={254}
              required
            />
            <p className="text-xs text-regal-navy-600 mt-1.5">
              Required for secure messaging. You&apos;ll receive a link to keep
              chatting with the owner.
            </p>
          </div>

          <div className="h-[65px] flex items-center justify-left">
            <div id="turnstile-widget"></div>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
