import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import CharacterLimitTextArea from './CharacterLimitTextArea';
import PrivacyWarning from './PrivacyWarning';
import { emailSchema } from '../../infrastructure/utils/validation';

interface Props {
  shortId: string;
  ownerName?: string;
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

export default function ContactModal({ shortId, ownerName, onClose }: Props) {
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Message Sent!
            </h2>
            <p className="text-neutral-700 mb-6">
              Your message has been sent to {ownerName || 'the owner'}!
              <br />
              <br />
              <strong>Check your email ({senderInfo})</strong> for a secure link
              to continue the conversation. Both you and the owner can
              communicate safely through our private messaging system.
            </p>
            <button onClick={onClose} className="finder-btn w-full">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">
            Contact {ownerName || 'Owner'}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-black mb-2"
            >
              Your message *
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
              placeholder="Hi! I found your bag. Let me know how to return it."
              rows={4}
              required
              variant="light"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-black"
            />
          </div>

          <div>
            <label
              htmlFor="senderName"
              className="block text-sm font-medium text-black mb-2"
            >
              Your name (optional)
            </label>
            <input
              id="senderName"
              type="text"
              placeholder="Your name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-black"
              maxLength={30}
            />
            {/* TODO: Change or remove this copy. End users never see each other's email addresses. */}
            {/* <p className="text-xs text-neutral-600 mt-1">
              This will be shown to the owner instead of your email address.
            </p> */}
          </div>

          <div>
            <label
              htmlFor="senderInfo"
              className="block text-sm font-medium text-black mb-2"
            >
              Your email address *
            </label>
            <input
              id="senderInfo"
              type="email"
              placeholder="your@email.com"
              value={senderInfo}
              onChange={(e) => setSenderInfo(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-black"
              maxLength={254}
              required
            />
            <p className="text-xs text-neutral-600 mt-1">
              Required for secure messaging. You&apos;ll receive a link to keep
              chatting with the owner.
            </p>
          </div>

          <div id="turnstile-widget"></div>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-neutral-200 text-neutral-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="flex-1 py-3 px-4 bg-black text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
