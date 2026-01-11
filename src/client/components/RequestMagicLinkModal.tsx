import { useState, useEffect } from 'react';
import { emailSchema } from '../../infrastructure/utils/validation';
import { SuccessIcon, ErrorIcon } from './icons/AppIcons';

interface RequestMagicLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
}

export default function RequestMagicLinkModal({
  isOpen,
  onClose,
  conversationId,
}: RequestMagicLinkModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          conversation_id: conversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send access link');
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send access link'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div
        className="fixed inset-0 bg-regal-navy-900 bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg p-8 w-full max-w-md shadow-soft-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <div className="mb-4 flex justify-center text-medium-jungle-700">
              <SuccessIcon color="currentColor" size="large" />
            </div>
            <h2 className="text-2xl font-semibold text-medium-jungle-700 mb-4">
              Check Your Email!
            </h2>
            <p className="text-regal-navy-700 mb-6 leading-relaxed">
              If your email address <strong>({email})</strong> is in our system,
              you&apos;ll receive a new secure chat link shortly.
              <br />
              <br />
              The link will be valid for <strong>7 days</strong>.
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
    <div
      className="fixed inset-0 bg-regal-navy-900 bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md shadow-soft-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-regal-navy-900">
            Lost your secure chat link?
          </h2>
          <button
            onClick={onClose}
            className="text-regal-navy-500 hover:text-regal-navy-700 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <p className="text-regal-navy-700 mb-6 leading-relaxed">
          Enter your email address and we&apos;ll send you a new secure link to
          access your {conversationId ? 'conversation' : 'dashboard'}.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-regal-navy-800 mb-2"
            >
              Your email address <span className="text-cinnabar-600">*</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
              className="input-field"
              maxLength={254}
              required
              autoFocus
            />
            <p className="text-xs text-regal-navy-600 mt-1.5">
              We&apos;ll send a new 7-day access link to this address if
              it&apos;s in our system.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <ErrorIcon
                color="currentColor"
                className="flex-shrink-0 mt-0.5"
              />
              <span className="text-sm">{error}</span>
            </div>
          )}

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
              disabled={loading || !email.trim()}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Access Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
