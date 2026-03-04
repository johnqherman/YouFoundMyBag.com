function relativeLuminance(hex: string): number {
  const linearize = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function getMinLuminance(hex1: string, hex2?: string | null): number {
  const l1 = relativeLuminance(hex1);
  if (!hex2 || hex2 === hex1) return l1;
  return Math.min(l1, relativeLuminance(hex2));
}

export const MAX_QR_LUMINANCE = 0.4;

const HEX6 = /^#[0-9a-fA-F]{6}$/;

export function isColorTooLight(hex: string): boolean {
  return HEX6.test(hex) && relativeLuminance(hex) > MAX_QR_LUMINANCE;
}
