import crypto from 'crypto';

/**
 * AES-256-GCM encryption parameters
 */
const AES_KEY_SIZE = 32; // 256 bits
const AES_NONCE_SIZE = 12; // 96 bits for GCM
const AES_TAG_SIZE = 16; // 128 bits

export interface EncryptedData {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
}

/**
 * Encrypt data using AES-256-GCM
 * @param plaintext Data to encrypt
 * @param key Encryption key (32 bytes)
 * @returns Encrypted data with nonce and tag
 */
export function encrypt(plaintext: Buffer, key: Buffer): EncryptedData {
  if (key.length !== AES_KEY_SIZE) {
    throw new Error(`Key must be ${AES_KEY_SIZE} bytes (256 bits)`);
  }

  // Generate random nonce
  const nonce = crypto.randomBytes(AES_NONCE_SIZE);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);

  // Encrypt
  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final()
  ]);

  // Get authentication tag
  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    nonce,
    tag
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param encrypted Encrypted data structure
 * @param key Decryption key (32 bytes)
 * @returns Decrypted plaintext
 */
export function decrypt(encrypted: EncryptedData, key: Buffer): Buffer {
  if (key.length !== AES_KEY_SIZE) {
    throw new Error(`Key must be ${AES_KEY_SIZE} bytes (256 bits)`);
  }

  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, encrypted.nonce);
  decipher.setAuthTag(encrypted.tag);

  // Decrypt
  try {
    const plaintext = Buffer.concat([
      decipher.update(encrypted.ciphertext),
      decipher.final()
    ]);
    return plaintext;
  } catch (error) {
    throw new Error('Decryption failed: invalid ciphertext or tag');
  }
}

/**
 * Serialize encrypted data to buffer format: [nonce][ciphertext][tag]
 * @param encrypted Encrypted data
 * @returns Serialized buffer
 */
export function serializeEncrypted(encrypted: EncryptedData): Buffer {
  return Buffer.concat([
    encrypted.nonce,
    encrypted.ciphertext,
    encrypted.tag
  ]);
}

/**
 * Deserialize buffer to encrypted data structure
 * @param data Serialized encrypted data
 * @returns Encrypted data structure
 */
export function deserializeEncrypted(data: Buffer): EncryptedData {
  if (data.length < AES_NONCE_SIZE + AES_TAG_SIZE) {
    throw new Error('Invalid encrypted data format');
  }

  const nonce = data.subarray(0, AES_NONCE_SIZE);
  const tag = data.subarray(data.length - AES_TAG_SIZE);
  const ciphertext = data.subarray(AES_NONCE_SIZE, data.length - AES_TAG_SIZE);

  return {
    nonce,
    ciphertext,
    tag
  };
}

/**
 * Generate a random encryption key (DEK)
 * @returns Random 32-byte key
 */
export function generateDEK(): Buffer {
  return crypto.randomBytes(AES_KEY_SIZE);
}


