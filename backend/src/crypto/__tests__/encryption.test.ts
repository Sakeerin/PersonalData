import { encrypt, decrypt, serializeEncrypted, deserializeEncrypted, generateDEK } from '../encryption';

describe('Encryption', () => {
  const plaintext = Buffer.from('Hello, World! This is a test message.');
  let key: Buffer;

  beforeEach(() => {
    key = generateDEK();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted.toString()).toBe(plaintext.toString());
    });

    it('should produce different ciphertexts for same plaintext (nonce randomness)', () => {
      const encrypted1 = encrypt(plaintext, key);
      const encrypted2 = encrypt(plaintext, key);

      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
      expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
    });

    it('should fail decryption with wrong key', () => {
      const encrypted = encrypt(plaintext, key);
      const wrongKey = generateDEK();

      expect(() => decrypt(encrypted, wrongKey)).toThrow('Decryption failed');
    });

    it('should fail decryption with tampered ciphertext', () => {
      const encrypted = encrypt(plaintext, key);
      const tampered = {
        ...encrypted,
        ciphertext: Buffer.from(encrypted.ciphertext)
      };
      tampered.ciphertext[0] ^= 1; // Flip a bit

      expect(() => decrypt(tampered, key)).toThrow('Decryption failed');
    });

    it('should fail decryption with tampered tag', () => {
      const encrypted = encrypt(plaintext, key);
      const tampered = {
        ...encrypted,
        tag: Buffer.from(encrypted.tag)
      };
      tampered.tag[0] ^= 1; // Flip a bit

      expect(() => decrypt(tampered, key)).toThrow('Decryption failed');
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize encrypted data', () => {
      const encrypted = encrypt(plaintext, key);
      const serialized = serializeEncrypted(encrypted);
      const deserialized = deserializeEncrypted(serialized);

      expect(deserialized.nonce).toEqual(encrypted.nonce);
      expect(deserialized.ciphertext).toEqual(encrypted.ciphertext);
      expect(deserialized.tag).toEqual(encrypted.tag);
    });

    it('should decrypt after serialization/deserialization', () => {
      const encrypted = encrypt(plaintext, key);
      const serialized = serializeEncrypted(encrypted);
      const deserialized = deserializeEncrypted(serialized);
      const decrypted = decrypt(deserialized, key);

      expect(decrypted.toString()).toBe(plaintext.toString());
    });
  });

  describe('key generation', () => {
    it('should generate unique keys', () => {
      const key1 = generateDEK();
      const key2 = generateDEK();

      expect(key1).not.toEqual(key2);
      expect(key1.length).toBe(32);
      expect(key2.length).toBe(32);
    });
  });
});


