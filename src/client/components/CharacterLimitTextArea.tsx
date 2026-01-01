import { useState } from 'react';

interface CharacterLimitTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  name?: string;
  variant?: 'light' | 'dark';
}

export default function CharacterLimitTextArea({
  value,
  onChange,
  maxLength,
  placeholder,
  className = '',
  disabled = false,
  required = false,
  rows = 4,
  name,
  variant = 'dark',
}: CharacterLimitTextAreaProps) {
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
    if (isAtLimit) return variant === 'light' ? 'text-red-600' : 'text-red-400';
    if (isNearLimit)
      return variant === 'light' ? 'text-yellow-600' : 'text-yellow-400';
    return variant === 'light' ? 'text-neutral-600' : 'text-neutral-400';
  };

  const getBorderColor = () => {
    if (disabled) return '';
    if (isAtLimit) return 'border-red-500 focus:ring-red-500';
    if (isNearLimit) return 'border-yellow-500 focus:ring-yellow-500';
    return variant === 'light'
      ? 'border-neutral-300 focus:ring-blue-500'
      : 'border-neutral-600 focus:ring-blue-500';
  };

  const baseClasses = `
    w-full p-3 rounded-lg resize-none
    focus:ring-2 focus:border-transparent transition-colors
    ${variant === 'light' ? 'bg-white disabled:bg-neutral-100' : 'bg-neutral-700 disabled:bg-neutral-600'}
    disabled:cursor-not-allowed
    ${getBorderColor()}
    ${className}
  `.trim();

  return (
    <div className="relative">
      <textarea
        name={name}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        className={baseClasses}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
      />

      <div
        className={`absolute bottom-3 right-3 text-sm font-mono ${getCounterColor()}`}
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

      <div className={`md:hidden mt-1 text-sm text-right ${getCounterColor()}`}>
        {value.length}/{maxLength}
      </div>
    </div>
  );
}

export function TextAreaWithLimit({
  maxLength,
  ...props
}: CharacterLimitTextAreaProps) {
  return <CharacterLimitTextArea maxLength={maxLength} {...props} />;
}
