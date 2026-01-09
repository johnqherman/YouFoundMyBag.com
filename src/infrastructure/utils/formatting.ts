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
    // fail silently
  }

  return phoneNumber;
}

export function lowercaseBagName(bagName: string | undefined): string {
  if (!bagName) return 'bag';
  return bagName.toLowerCase();
}

export function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
