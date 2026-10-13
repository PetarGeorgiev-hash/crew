import { codesMatch, generateCode, hashCode } from '../../utils/email-code';

describe('email-code utils', () => {
  describe('generateCode', () => {
    it('returns a code in the expected format', () => {
      expect(generateCode()).toMatch(/^\d{6}$/);
    });

    it('should not return the same code every time', () => {
      const codes = new Set(Array.from({ length: 50 }, generateCode));
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe('hashCode', () => {
    it('is deterministic for the same inputs', () => {
      expect(hashCode('secret', 'user-1', '123456')).toBe(
        hashCode('secret', 'user-1', '123456'),
      );
    });

    it('should change when the code, user or secret changes', () => {
      const base = hashCode('secret', 'user-1', '123456');
      expect(hashCode('secret', 'user-1', '654321')).not.toBe(base);
      expect(hashCode('secret', 'user-2', '123456')).not.toBe(base);
      expect(hashCode('other', 'user-1', '123456')).not.toBe(base);
    });

    it('should not contain the plain code', () => {
      expect(hashCode('secret', 'user-1', '123456')).not.toContain('123456');
    });
  });

  describe('codesMatch', () => {
    it('matches equal values', () => {
      const h = hashCode('secret', 'user-1', '123456');
      expect(codesMatch(h, h)).toBe(true);
    });

    it('should reject different values', () => {
      expect(
        codesMatch(
          hashCode('secret', 'user-1', '123456'),
          hashCode('secret', 'user-1', '654321'),
        ),
      ).toBe(false);
    });

    it('should return false (does not throw) for different lengths', () => {
      expect(codesMatch('abc', 'abcd')).toBe(false);
    });
  });
});
