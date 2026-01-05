import { deriveKEK, wrapDEK, unwrapDEK, generateWrappedDEK, rotateKEK, verifyKEK } from '../keyManager';
import { generateDEK } from '../encryption';

describe('Key Manager', () => {
  const password = 'test_password_123';
  let kek: Awaited<ReturnType<typeof deriveKEK>>;

  beforeEach(async () => {
    kek = await deriveKEK(password);
  });

  describe('KEK derivation', () => {
    it('should derive KEK from password', async () => {
      expect(kek.key.length).toBe(32);
      expect(kek.salt.length).toBe(16);
    });

    it('should produce same KEK with same password and salt', async () => {
      const kek2 = await deriveKEK(password, kek.salt);
      expect(kek2.key).toEqual(kek.key);
    });

    it('should produce different KEK with different salt', async () => {
      const kek2 = await deriveKEK(password);
      expect(kek2.key).not.toEqual(kek.key);
    });

    it('should produce different KEK with different password', async () => {
      const kek2 = await deriveKEK('different_password', kek.salt);
      expect(kek2.key).not.toEqual(kek.key);
    });
  });

  describe('DEK wrapping', () => {
    it('should wrap and unwrap DEK correctly', () => {
      const dek = generateDEK();
      const wrapped = wrapDEK(dek, kek.key);
      const unwrapped = unwrapDEK(wrapped, kek.key);

      expect(unwrapped).toEqual(dek);
    });

    it('should fail unwrap with wrong KEK', () => {
      const dek = generateDEK();
      const wrapped = wrapDEK(dek, kek.key);
      const wrongKEK = generateDEK();

      expect(() => unwrapDEK(wrapped, wrongKEK)).toThrow();
    });

    it('should generate wrapped DEK', () => {
      const wrappedDEK = generateWrappedDEK(kek.key);
      expect(wrappedDEK.key.length).toBe(32);
      expect(wrappedDEK.wrapped.ciphertext.length).toBeGreaterThan(0);
    });
  });

  describe('KEK rotation', () => {
    it('should rotate KEK and re-wrap DEKs', async () => {
      const dek1 = generateDEK();
      const dek2 = generateDEK();

      const wrapped1 = wrapDEK(dek1, kek.key);
      const wrapped2 = wrapDEK(dek2, kek.key);

      const newKEK = generateDEK();
      const reWrapped = await rotateKEK(kek.key, newKEK, [wrapped1, wrapped2]);

      // Verify DEKs can be unwrapped with new KEK
      const unwrapped1 = unwrapDEK(reWrapped[0], newKEK);
      const unwrapped2 = unwrapDEK(reWrapped[1], newKEK);

      expect(unwrapped1).toEqual(dek1);
      expect(unwrapped2).toEqual(dek2);
    });

    it('should fail to unwrap with old KEK after rotation', async () => {
      const dek = generateDEK();
      const wrapped = wrapDEK(dek, kek.key);

      const newKEK = generateDEK();
      const reWrapped = await rotateKEK(kek.key, newKEK, [wrapped]);

      expect(() => unwrapDEK(reWrapped[0], kek.key)).toThrow();
    });
  });

  describe('KEK verification', () => {
    it('should verify correct KEK', () => {
      const dek = generateDEK();
      const wrapped = wrapDEK(dek, kek.key);

      expect(verifyKEK(kek.key, wrapped)).toBe(true);
    });

    it('should reject incorrect KEK', () => {
      const dek = generateDEK();
      const wrapped = wrapDEK(dek, kek.key);
      const wrongKEK = generateDEK();

      expect(verifyKEK(wrongKEK, wrapped)).toBe(false);
    });
  });
});


