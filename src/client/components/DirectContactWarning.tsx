import { useState, useEffect } from 'react';
import { TIME_CONSTANTS as t } from '../constants/timeConstants';

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DirectContactWarning({
  isOpen,
  onConfirm,
  onCancel,
}: Props) {
  const [hasReadWarning, setHasReadWarning] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [showDelayedContent, setShowDelayedContent] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(10);

  useEffect(() => {
    if (isOpen) {
      setHasReadWarning(false);
      setConfirmationText('');
      setShowDelayedContent(false);
      setRemainingSeconds(10);

      const timer = setTimeout(() => {
        setShowDelayedContent(true);
      }, t.TEN_SECONDS);

      const countdown = setInterval(() => {
        setRemainingSeconds((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(countdown);
            return 0;
          }
          return newValue;
        });
      }, t.ONE_SECOND);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        clearInterval(countdown);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
    return undefined;
  }, [isOpen, onCancel]);

  const isConfirmationValid =
    confirmationText.toLowerCase().trim() === 'i understand';
  const canProceed =
    hasReadWarning && isConfirmationValid && showDelayedContent;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-800 border border-neutral-700 rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-amber-400 text-2xl flex-shrink-0 mt-1">⚠️</div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">
              Important: Direct Contact Warning
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-white transition-colors p-1"
            aria-label="Close warning"
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

        <div className="bg-amber-900 border border-amber-700 text-amber-200 p-4 rounded-lg mb-6">
          <p className="font-semibold mb-3">Choosing direct contact means:</p>
          <ul className="space-y-2 text-sm">
            <li>
              Anyone who finds your bag will see your contact info. You may
              receive calls, texts, or messages that we cannot filter for spam,
              inappropriate content, or harassment.
            </li>
          </ul>
          <p className="mt-3 font-semibold text-amber-100">
            This choice cannot be undone later.
          </p>
        </div>

        {showDelayedContent && (
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasReadWarning}
                  onChange={(e) => setHasReadWarning(e.target.checked)}
                  className="rounded border-neutral-600 bg-neutral-700 text-blue-500"
                />
                <span className="text-neutral-300">
                  I have read and understand these risks
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Type &quot;I understand&quot; to continue:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type the confirmation text..."
                className="input-field w-full"
                disabled={!hasReadWarning}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
              >
                Use Secure Messaging Instead
              </button>
              <button
                onClick={onConfirm}
                disabled={!canProceed}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  canProceed
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                }`}
              >
                Proceed with Direct Contact
              </button>
            </div>
          </div>
        )}

        {!showDelayedContent && (
          <div className="text-center py-4">
            <div className="text-neutral-400 text-sm">
              Please read the warning above carefully...
            </div>
            <div className="mt-2 text-neutral-500 text-xs">
              Options will appear in {remainingSeconds} seconds
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
