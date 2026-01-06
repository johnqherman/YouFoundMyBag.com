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

export function lowercaseBagName(bagName: string | undefined): string {
  if (!bagName) return 'bag';
  return bagName
    .split(' ')
    .map((word) => word.charAt(0).toLowerCase() + word.slice(1))
    .join(' ');
}
