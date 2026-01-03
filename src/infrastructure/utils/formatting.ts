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
