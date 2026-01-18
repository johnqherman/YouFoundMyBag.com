import React from 'react';
import type { CharacterLimitTextAreaProps } from '../types/index.js';

const CharacterLimitTextArea = React.forwardRef<
  HTMLTextAreaElement,
  CharacterLimitTextAreaProps
>(
  (
    {
      value,
      onChange,
      maxLength,
      placeholder,
      className = '',
      disabled = false,
      required = false,
      rows = 4,
      name,
      variant: _variant = 'dark',
    },
    ref
  ) => {
    const remaining = maxLength - value.length;
    const isNearLimit = remaining <= 20;
    const isAtLimit = remaining <= 0;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;

      if (newValue.length <= maxLength) {
        onChange(newValue);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const availableSpace = maxLength - value.length;
      const textToAdd = pastedText.slice(0, availableSpace);
      onChange(value + textToAdd);
    };

    const getCounterColor = () => {
      if (isAtLimit) return 'text-cinnabar-600';
      if (isNearLimit) return 'text-saffron-700';
      return 'text-regal-navy-500';
    };

    const getBorderColor = () => {
      if (disabled) return '';
      if (isAtLimit) return 'border-cinnabar-500 focus:ring-cinnabar-500';
      if (isNearLimit) return 'border-saffron-500 focus:ring-saffron-500';
      return '';
    };

    const baseClasses = `
    w-full px-3 py-2.5 bg-white border border-regal-navy-200 rounded-lg resize-none
    text-regal-navy-900 placeholder-regal-navy-400
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-regal-navy-500 focus:border-regal-navy-500
    disabled:bg-regal-navy-50 disabled:text-regal-navy-500 disabled:cursor-not-allowed
    ${getBorderColor()}
    ${className}
  `.trim();

    return (
      <div className="relative">
        <textarea
          ref={ref}
          name={name}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={`${baseClasses} pb-7 sm:pb-2.5`}
          disabled={disabled}
          required={required}
          rows={rows}
          maxLength={maxLength}
        />

        {/* Character counter - positioned inside on desktop, below on mobile */}
        <div
          className={`absolute bottom-2 right-3 text-xs font-medium pointer-events-none ${getCounterColor()}`}
        >
          {value.length}/{maxLength}
        </div>

        {isNearLimit && (
          <div className="sr-only" aria-live="polite">
            {remaining === 0
              ? 'Character limit reached'
              : `${remaining} characters remaining`}
          </div>
        )}
      </div>
    );
  }
);

CharacterLimitTextArea.displayName = 'CharacterLimitTextArea';

export default CharacterLimitTextArea;

export function TextAreaWithLimit({
  maxLength,
  ...props
}: CharacterLimitTextAreaProps) {
  return <CharacterLimitTextArea maxLength={maxLength} {...props} />;
}
