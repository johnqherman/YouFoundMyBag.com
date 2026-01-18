import { useState } from 'react';
import type { CharacterLimitInputProps } from '../types/index.js';

export default function CharacterLimitInput({
  value,
  onChange,
  maxLength,
  placeholder,
  className = '',
  disabled = false,
  required = false,
  type = 'text',
  name,
}: CharacterLimitInputProps) {
  const remaining = maxLength - value.length;
  const isNearLimit = remaining <= 20;
  const isAtLimit = remaining <= 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
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
      <input
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        className={`${baseClasses} pr-16 sm:pr-20`}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
      />

      <div
        className={`absolute top-1/2 -translate-y-1/2 right-3 text-xs font-medium pointer-events-none ${getCounterColor()}`}
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

export function useCharacterLimit(
  initialValue: string = '',
  maxLength: number
) {
  const [value, setValue] = useState(initialValue);
  const remaining = maxLength - value.length;
  const isNearLimit = remaining <= 20;
  const isAtLimit = remaining <= 0;

  const handleChange = (newValue: string) => {
    if (newValue.length <= maxLength) {
      setValue(newValue);
    }
  };

  const handlePaste = (pastedText: string) => {
    const availableSpace = maxLength - value.length;
    const textToAdd = pastedText.slice(0, availableSpace);
    setValue(value + textToAdd);
  };

  return {
    value,
    setValue: handleChange,
    remaining,
    isNearLimit,
    isAtLimit,
    handlePaste,
    maxLength,
    progress: (value.length / maxLength) * 100,
  };
}
