import { useState, useEffect } from 'react';
import type { PrivacyWarningProps } from '../types/index.js';

export default function PrivacyWarning({
  message,
  storageKey,
  variant = 'dark',
  className = '',
}: PrivacyWarningProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    setIsVisible(!dismissed);
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'dismissed');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const baseClasses = `
    flex items-start gap-2 p-3 rounded-lg text-sm border
    ${
      variant === 'light'
        ? 'bg-saffron-50 border-saffron-200 text-saffron-900'
        : 'bg-saffron-900/20 border-saffron-600/30 text-saffron-200'
    }
    ${className}
  `.trim();

  const buttonClasses = `
    text-xs opacity-70 hover:opacity-100 ml-auto flex-shrink-0 font-bold transition-opacity
    ${variant === 'light' ? 'text-saffron-700' : 'text-saffron-200'}
  `;

  return (
    <div className={baseClasses}>
      <span className="text-base">💡</span>
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={handleDismiss}
        className={buttonClasses}
        aria-label="Dismiss privacy tip"
      >
        ×
      </button>
    </div>
  );
}
