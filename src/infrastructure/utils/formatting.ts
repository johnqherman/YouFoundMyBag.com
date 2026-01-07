import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function formatContactValue(type: string, value: string): string {
  if (
    (type === 'instagram' || type === 'telegram') &&
    value &&
    !value.startsWith('@')
  ) {
    return `@${value}`;
  }
  return value;
}

export function formatContactTypeName(type: string): string {
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
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) {
    return phoneNumber;
  }

  try {
    const parsed = parsePhoneNumberFromString(phoneNumber);

    if (parsed && parsed.isValid()) {
      return parsed.formatInternational();
    }
  } catch (error) {
    console.warn('Failed to parse phone number:', phoneNumber, error);
  }

  return phoneNumber;
}

export function lowercaseBagName(bagName: string | undefined): string {
  if (!bagName) return 'bag';
  return bagName.toLowerCase();
}
