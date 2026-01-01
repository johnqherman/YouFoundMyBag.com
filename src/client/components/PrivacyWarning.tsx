import { useState, useEffect } from 'react';

interface PrivacyWarningProps {
  message: string;
  storageKey: string;
  variant?: 'light' | 'dark';
  className?: string;
}

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
        ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
        : 'bg-yellow-900/20 border-yellow-600/30 text-yellow-300'
    }
    ${className}
  `.trim();

  const buttonClasses = `
    text-xs opacity-70 hover:opacity-100 ml-auto flex-shrink-0 font-bold
    ${variant === 'light' ? 'text-yellow-700' : 'text-yellow-200'}
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
