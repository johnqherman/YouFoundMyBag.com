import { customAlphabet } from 'nanoid';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const generateShortId = customAlphabet(ALPHABET, 6);

export function isValidShortId(shortId: string): boolean {
  if (shortId.length !== 6) return false;
  return [...shortId].every((char) => ALPHABET.includes(char));
}

export function createReadableShortId(): string {
  let shortId: string;
  do {
    shortId = generateShortId();
  } while (!isValidShortId(shortId));
  return shortId;
}
