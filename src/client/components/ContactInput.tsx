import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import 'intl-tel-input/styles';
import IntlTelInput from 'intl-tel-input/reactWithUtils';
import type {
  ContactWithId,
  IntlTelInputRef,
  ContactInputProps,
} from '../types/index';
import { emailSchema } from '../../infrastructure/utils/validation';
import { capitalizeWords } from '../../infrastructure/utils/formatting';
import {
  SignalIcon,
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  brandColors,
} from './icons/BrandIcons';
import { MailIcon, PhoneContactIcon } from './icons/AppIcons';

export default function ContactInput({
  contact,
  onUpdate,
  onRemove,
  availableTypes,
  showRemoveButton = false,
}: ContactInputProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [customLabel, setCustomLabel] = useState(contact.label || '');

  const intlTelInputInstanceRef = useRef<IntlTelInputRef | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const isUpdatingFromPropRef = useRef(false);

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
    if (
      isMountedRef.current &&
      isPhoneType(contact.type) &&
      contact.value !== phoneNumber
    ) {
      isUpdatingFromPropRef.current = true;
      setPhoneNumber(contact.value || '');
      setTimeout(() => {
        isUpdatingFromPropRef.current = false;
      }, 0);
    }
  }, [contact.value, contact.type, phoneNumber]);

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

    let processedValue = newValue;
    if (
      contact.type === 'email' ||
      contact.type === 'telegram' ||
      contact.type === 'instagram' ||
      contact.type === 'other'
    ) {
      processedValue = newValue.replace(/\s/g, '');
    }

    const errors: string[] = [];
    if (processedValue.trim()) {
      if (contact.type === 'email') {
        const result = emailSchema.safeParse(processedValue);
        if (!result.success) {
          errors.push('Please enter a valid email address');
        }
      }
    }

    if (isMountedRef.current) {
      setErrors(errors);
      onUpdate({
        ...contact,
        value: processedValue,
      });
    }
  };

  const handleCustomLabelChange = (label: string) => {
    const capitalizedLabel = capitalizeWords(label);
    setCustomLabel(capitalizedLabel);
    if (contact.type === 'other') {
      onUpdate({
        ...contact,
        label: capitalizedLabel,
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

  const getContactTypeIcon = (type: string) => {
    const iconProps = { size: 18, className: '' };
    switch (type) {
      case 'sms':
        return <PhoneContactIcon color="currentColor" />;
      case 'email':
        return <MailIcon color="currentColor" />;
      case 'signal':
        return (
          <SignalIcon {...iconProps} style={{ color: brandColors.signal }} />
        );
      case 'whatsapp':
        return (
          <WhatsAppIcon
            {...iconProps}
            style={{ color: brandColors.whatsapp }}
          />
        );
      case 'telegram':
        return (
          <TelegramIcon
            {...iconProps}
            style={{ color: brandColors.telegram }}
          />
        );
      case 'instagram':
        return (
          <InstagramIcon
            {...iconProps}
            style={{ color: brandColors.instagram }}
          />
        );
      default:
        return null;
    }
  };

  const getContactTypeLabel = (type: string) => {
    switch (type) {
      case 'sms':
        return 'Phone Number';
      case 'whatsapp':
        return 'WhatsApp';
      case 'email':
        return 'Email';
      case 'instagram':
        return 'Instagram';
      case 'telegram':
        return 'Telegram';
      case 'signal':
        return 'Signal';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  return (
    <div
      className="contact-input-wrapper bg-regal-navy-50 border border-regal-navy-200 rounded-lg p-4 relative transition-all duration-200 hover:border-regal-navy-300 hover:shadow-md"
      data-type={contact.type}
    >
      {showRemoveButton && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 text-cinnabar-600 hover:text-cinnabar-700 text-xl font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-cinnabar-50 transition-all duration-200 hover:scale-110"
          aria-label="Remove contact"
        >
          ×
        </button>
      )}

      <div className="pr-8">
        <div className="relative mb-3 w-fit">
          <div className="absolute left-3 top-0 bottom-0 pointer-events-none z-10 flex items-center brand-icon-appear">
            {getContactTypeIcon(contact.type)}
          </div>
          <select
            value={contact.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="contact-type-dropdown input-field w-auto appearance-none pr-8"
            style={{
              paddingLeft:
                contact.type === 'sms' ||
                contact.type === 'email' ||
                contact.type === 'signal' ||
                contact.type === 'whatsapp' ||
                contact.type === 'telegram' ||
                contact.type === 'instagram'
                  ? '2.5rem'
                  : '0.75rem',
            }}
          >
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {getContactTypeLabel(type)}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200">
            <svg
              className="w-4 h-4 text-regal-navy-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

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
              initialValue={phoneNumber}
              onChangeNumber={(number) => {
                if (isMountedRef.current && !isUpdatingFromPropRef.current) {
                  setPhoneNumber(number);
                  if (number !== contact.value) {
                    onUpdate({
                      ...contact,
                      value: number,
                    });
                  }
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
                className: `input-field ${!isPhoneValid && phoneNumber ? 'border-cinnabar-500' : ''}`,
                required: true,
              }}
            />
          </div>
        ) : contact.type === 'email' ? (
          <div
            key={`email-${contact.id}`}
            className={`relative mb-3 ${errors.length > 0 ? 'border-cinnabar-500' : ''}`}
          >
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center gap-1.5">
              {getContactTypeIcon(contact.type)}
            </div>
            <input
              key={`email-input-${contact.id}`}
              type={getInputType()}
              placeholder={getPlaceholder()}
              value={contact.value}
              onChange={(e) => handleNonPhoneValueChange(e.target.value)}
              className={`contact-input-with-icon input-field transition-all duration-200 ${errors.length > 0 ? 'border-cinnabar-500' : ''}`}
              style={{ paddingLeft: '2.5rem' }}
              required
            />
          </div>
        ) : contact.type === 'instagram' || contact.type === 'telegram' ? (
          <div
            key={`social-${contact.id}`}
            className={`relative mb-3 ${errors.length > 0 ? 'border-cinnabar-500' : ''}`}
          >
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center gap-1.5">
              {getContactTypeIcon(contact.type)}
              <span className="text-regal-navy-500 font-medium">@</span>
            </div>
            <input
              key={`social-input-${contact.id}`}
              type={getInputType()}
              placeholder={getPlaceholder()}
              value={contact.value}
              onChange={(e) => handleNonPhoneValueChange(e.target.value)}
              className={`contact-input-with-icon input-field transition-all duration-200 ${errors.length > 0 ? 'border-cinnabar-500' : ''}`}
              style={{ paddingLeft: '3.5rem' }}
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
            className={`input-field mb-3 ${errors.length > 0 ? 'border-cinnabar-500' : ''}`}
            required
          />
        )}

        <div className="flex items-center mt-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={contact.is_primary || false}
              onChange={(e) => handlePrimaryChange(e.target.checked)}
              className="rounded border-regal-navy-300 bg-white text-regal-navy-600 focus:ring-regal-navy-500"
            />
            <span className="text-regal-navy-700 select-none">
              Primary contact method
            </span>
          </label>
        </div>

        {errors.length > 0 && (
          <div className="mt-2">
            {errors.map((error, index) => (
              <p key={index} className="text-cinnabar-600 text-xs">
                {error}
              </p>
            ))}
          </div>
        )}

        {isPhoneType(contact.type) && !isPhoneValid && phoneNumber.trim() && (
          <div className="mt-2">
            <p className="text-cinnabar-600 text-xs">
              Please enter a valid phone number
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
