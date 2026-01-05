import {
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
  verifyRecoveryCodeAgainstArray
} from '../recovery';

describe('Recovery Codes', () => {
  describe('generation', () => {
    it('should generate recovery codes', () => {
      const codes = generateRecoveryCodes();
      expect(codes.length).toBe(10);
      codes.forEach(code => {
        expect(code.length).toBe(8);
        expect(code).toMatch(/^[A-Z2-9]+$/); // Only valid charset chars
      });
    });

    it('should generate unique codes', () => {
      const codes = generateRecoveryCodes();
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('hashing and verification', () => {
    it('should hash and verify recovery code', async () => {
      const code = 'TEST1234';
      const hash = await hashRecoveryCode(code);
      const isValid = await verifyRecoveryCode(code, hash);

      expect(isValid).toBe(true);
      expect(hash).not.toBe(code);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should reject incorrect recovery code', async () => {
      const code = 'TEST1234';
      const hash = await hashRecoveryCode(code);
      const isValid = await verifyRecoveryCode('WRONG12', hash);

      expect(isValid).toBe(false);
    });

    it('should verify code against array of hashes', async () => {
      const codes = ['CODE1', 'CODE2', 'CODE3'];
      const hashes = await Promise.all(codes.map(code => hashRecoveryCode(code)));

      const index = await verifyRecoveryCodeAgainstArray('CODE2', hashes);
      expect(index).toBe(1);

      const notFound = await verifyRecoveryCodeAgainstArray('WRONG', hashes);
      expect(notFound).toBe(-1);
    });
  });
});


