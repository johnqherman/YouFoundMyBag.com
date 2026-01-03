import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import 'intl-tel-input/styles';
import IntlTelInput from 'intl-tel-input/reactWithUtils';
import '../intl-tel-input-dark-theme.css';
import type { ContactWithId } from '../types/index';

interface ContactInputProps {
  contact: ContactWithId;
  onUpdate: (contact: ContactWithId) => void;
  onRemove?: () => void;
  availableTypes: Array<
    'sms' | 'whatsapp' | 'email' | 'instagram' | 'telegram' | 'signal' | 'other'
  >;
  showRemoveButton?: boolean;
}

export default function ContactInput({
  contact,
  onUpdate,
  onRemove,
  availableTypes,
  showRemoveButton = false,
}: ContactInputProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [customLabel, setCustomLabel] = useState(contact.label || '');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intlTelInputInstanceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  const [phoneNumber, setPhoneNumber] = useState(contact.value || '');
  const [isPhoneValid, setIsPhoneValid] = useState(true);

  useLayoutEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intlTelInputInstanceRef.current) {
        try {
          intlTelInputInstanceRef.current = null;
        } catch (e) {
          console.warn('IntlTelInput cleanup warning:', e);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (isMountedRef.current && isPhoneType(contact.type)) {
      setPhoneNumber(contact.value || '');
    }
  }, [contact.value, contact.type]);

  const isPhoneType = (type: string) => {
    return ['sms', 'whatsapp', 'signal'].includes(type);
  };

  const handleTypeChange = (newType: string) => {
    if (!isMountedRef.current) return;

    const typedNewType = newType as ContactWithId['type'];

    const wasPhoneType = isPhoneType(contact.type);
    const isNowPhoneType = isPhoneType(typedNewType);

    let currentValue = contact.value;
    if (wasPhoneType && isMountedRef.current) {
      currentValue = phoneNumber;
    }

    const finalValue = wasPhoneType !== isNowPhoneType ? '' : currentValue;

    if (isMountedRef.current) {
      onUpdate({
        ...contact,
        type: typedNewType,
        value: finalValue,
        label: typedNewType === 'other' ? customLabel : undefined,
      });
    }
  };

  const handleNonPhoneValueChange = (newValue: string) => {
    if (!isMountedRef.current) return;

    const errors: string[] = [];
    if (newValue.trim()) {
      if (contact.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newValue)) {
          errors.push('Please enter a valid email address');
        }
      }
    }

    if (isMountedRef.current) {
      setErrors(errors);
      onUpdate({
        ...contact,
        value: newValue,
      });
    }
  };

  const handleCustomLabelChange = (label: string) => {
    setCustomLabel(label);
    if (contact.type === 'other') {
      onUpdate({
        ...contact,
        label,
      });
    }
  };

  const handlePrimaryChange = (isPrimary: boolean) => {
    onUpdate({
      ...contact,
      is_primary: isPrimary,
    });
  };

  const getPlaceholder = () => {
    switch (contact.type) {
      case 'email':
        return 'your@email.com';
      case 'instagram':
      case 'telegram':
        return 'username';
      case 'other':
        return 'Contact information';
      default:
        return 'Enter contact info';
    }
  };

  const getInputType = () => {
    return 'text';
  };

  return (
    <div className="bg-neutral-800 rounded-xl p-4 relative">
      {showRemoveButton && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-900/20"
          aria-label="Remove contact"
        >
          ×
        </button>
      )}

      <div className="pr-8">
        <select
          value={contact.type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="input-field w-auto mb-3"
        >
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {type === 'sms' && 'Phone Number'}
              {type === 'whatsapp' && 'WhatsApp'}
              {type === 'email' && 'Email'}
              {type === 'instagram' && 'Instagram'}
              {type === 'telegram' && 'Telegram'}
              {type === 'signal' && 'Signal'}
              {type === 'other' && 'Other'}
            </option>
          ))}
        </select>

        {contact.type === 'other' && (
          <input
            type="text"
            placeholder="e.g., Discord, Skype, etc."
            value={customLabel}
            onChange={(e) => handleCustomLabelChange(e.target.value)}
            className="input-field mb-3"
            maxLength={50}
          />
        )}

        {isPhoneType(contact.type) ? (
          <div
            key={`phone-${contact.id}`}
            ref={containerRef}
            className="phone-input-container"
          >
            <IntlTelInput
              key={`phone-input-${contact.id}`}
              ref={(instance) => {
                intlTelInputInstanceRef.current = instance;
              }}
              onChangeNumber={(number) => {
                if (isMountedRef.current) {
                  setPhoneNumber(number);
                }
              }}
              onChangeValidity={(isValid) => {
                if (isMountedRef.current) {
                  setIsPhoneValid(isValid);
                }
              }}
              initOptions={{
                initialCountry: 'us',
              }}
              inputProps={{
                className: `input-field ${!isPhoneValid && phoneNumber ? 'border-red-500' : ''}`,
                required: true,
                onBlur: () => {
                  if (isMountedRef.current) {
                    onUpdate({
                      ...contact,
                      value: phoneNumber,
                    });
                  }
                },
              }}
            />
          </div>
        ) : contact.type === 'instagram' || contact.type === 'telegram' ? (
          <div
            key={`social-${contact.id}`}
            className={`relative mb-3 ${errors.length > 0 ? 'border-red-500' : ''}`}
          >
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              @
            </div>
            <input
              key={`social-input-${contact.id}`}
              type={getInputType()}
              placeholder={getPlaceholder()}
              value={contact.value}
              onChange={(e) => handleNonPhoneValueChange(e.target.value)}
              className={`input-field pl-8 ${errors.length > 0 ? 'border-red-500' : ''}`}
              required
            />
          </div>
        ) : (
          <input
            key={`text-${contact.id}`}
            type={getInputType()}
            placeholder={getPlaceholder()}
            value={contact.value}
            onChange={(e) => handleNonPhoneValueChange(e.target.value)}
            className={`input-field mb-3 ${errors.length > 0 ? 'border-red-500' : ''}`}
            required
          />
        )}

        <div className="flex items-center mt-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={contact.is_primary || false}
              onChange={(e) => handlePrimaryChange(e.target.checked)}
              className="rounded border-neutral-600 bg-neutral-700 text-blue-500"
            />
            <span className="text-neutral-400">Primary contact method</span>
          </label>
        </div>

        {errors.length > 0 && (
          <div className="mb-3">
            {errors.map((error, index) => (
              <p key={index} className="text-red-400 text-xs">
                {error}
              </p>
            ))}
          </div>
        )}

        {isPhoneType(contact.type) && !isPhoneValid && phoneNumber.trim() && (
          <div className="mb-3">
            <p className="text-red-400 text-xs">
              Please enter a valid phone number
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
