import Twemoji from './Twemoji.js';
import type { PrivacyWarningProps } from '../types/index.js';

export default function PrivacyWarning({
  message,
  variant = 'dark',
  className = '',
}: PrivacyWarningProps) {
  const baseClasses = `
    flex items-start gap-2 p-3 rounded-lg text-sm border
    ${
      variant === 'light'
        ? 'bg-saffron-50 border-saffron-200 text-saffron-900'
        : 'bg-saffron-900/20 border-saffron-600/30 text-saffron-200'
    }
    ${className}
  `.trim();

  return (
    <div className={baseClasses}>
      <Twemoji className="text-base">💡</Twemoji>
      <span>{message}</span>
    </div>
  );
}
