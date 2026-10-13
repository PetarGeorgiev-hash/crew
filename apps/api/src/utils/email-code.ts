import { createHmac, randomInt, timingSafeEqual } from 'crypto';

export const generateCode = (): string =>
  randomInt(0, 1_000_000).toString().padStart(6, '0');

export const hashCode = (
  secret: string,
  userId: string,
  code: string,
): string =>
  createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');

// Compares in constant time, so response time doesn't leak how much matched
export const codesMatch = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
