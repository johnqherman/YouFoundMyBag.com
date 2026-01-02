import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import 'intl-tel-input/styles';
import IntlTelInput from 'intl-tel-input/reactWithUtils';
import '../intl-tel-input-dark-theme.css';
import type { ContactWithId } from '../types/index';

interface ContactInputProps {
  contact: ContactWithId;
  onUpdate: (contact: ContactWithId) => void;
  onRemove?: () => void;
  availableTypes: Array<'sms' | 'signal' | 'whatsapp' | 'telegram'>;
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

    const typedNewType = newType as 'sms' | 'signal' | 'whatsapp' | 'telegram';

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
      });
    }
  };

  const handleNonPhoneValueChange = (newValue: string) => {
    if (!isMountedRef.current) return;

    const errors: string[] = [];
    if (newValue.trim()) {
      if (contact.type === 'telegram') {
        if (!newValue.startsWith('@')) {
          errors.push('Telegram username should start with @');
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

  const getPlaceholder = () => {
    switch (contact.type) {
      case 'telegram':
        return '@username';
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
              {type === 'sms' && 'Text/SMS'}
              {type === 'signal' && 'Signal'}
              {type === 'whatsapp' && 'WhatsApp'}
              {type === 'telegram' && 'Telegram'}
            </option>
          ))}
        </select>

        {isPhoneType(contact.type) ? (
          <div ref={containerRef} className="phone-input-container">
            <IntlTelInput
              key={`phone-${contact.id}`}
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
                className: `input-field mb-3 ${!isPhoneValid && phoneNumber ? 'border-red-500' : ''}`,
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
        ) : (
          <input
            type={getInputType()}
            placeholder={getPlaceholder()}
            value={contact.value}
            onChange={(e) => handleNonPhoneValueChange(e.target.value)}
            className={`input-field mb-3 ${errors.length > 0 ? 'border-red-500' : ''}`}
            required
          />
        )}

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
