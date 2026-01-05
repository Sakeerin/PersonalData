/**
 * Client-side cryptographic utilities for vault operations
 * Uses Web Crypto API for browser-based encryption
 */

/**
 * Generate a random encryption key (DEK)
 */
export async function generateDEK(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-256-GCM
 * @param data Data to encrypt (Uint8Array)
 * @param key Encryption key
 * @returns Encrypted data with nonce and tag
 */
export async function encryptData(
  data: Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array; tag: Uint8Array }> {
  // Generate random nonce (12 bytes for GCM)
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce
    },
    key,
    data
  );

  // Extract tag (last 16 bytes) and ciphertext
  const encryptedArray = new Uint8Array(encrypted);
  const tag = encryptedArray.slice(-16);
  const ciphertext = encryptedArray.slice(0, -16);

  return {
    ciphertext,
    nonce,
    tag
  };
}

/**
 * Decrypt data with AES-256-GCM
 * @param encrypted Encrypted data structure
 * @param key Decryption key
 * @returns Decrypted plaintext
 */
export async function decryptData(
  encrypted: { ciphertext: Uint8Array; nonce: Uint8Array; tag: Uint8Array },
  key: CryptoKey
): Promise<Uint8Array> {
  // Combine ciphertext and tag
  const encryptedData = new Uint8Array(encrypted.ciphertext.length + encrypted.tag.length);
  encryptedData.set(encrypted.ciphertext);
  encryptedData.set(encrypted.tag, encrypted.ciphertext.length);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: encrypted.nonce
    },
    key,
    encryptedData
  );

  return new Uint8Array(decrypted);
}

/**
 * Serialize encrypted data to base64
 */
export function serializeEncrypted(encrypted: {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
}): string {
  const combined = new Uint8Array(
    encrypted.nonce.length + encrypted.ciphertext.length + encrypted.tag.length
  );
  combined.set(encrypted.nonce, 0);
  combined.set(encrypted.ciphertext, encrypted.nonce.length);
  combined.set(encrypted.tag, encrypted.nonce.length + encrypted.ciphertext.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Deserialize base64 to encrypted data structure
 */
export function deserializeEncrypted(data: string): {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
} {
  const combined = Uint8Array.from(atob(data), c => c.charCodeAt(0));

  const nonce = combined.slice(0, 12);
  const tag = combined.slice(-16);
  const ciphertext = combined.slice(12, -16);

  return {
    nonce,
    ciphertext,
    tag
  };
}

/**
 * Derive KEK from password using PBKDF2 (browser-compatible alternative to Argon2)
 * Note: In production, consider using a more secure KDF or doing this server-side
 */
export async function deriveKEKFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256'
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Wrap DEK with KEK
 */
export async function wrapDEK(dek: CryptoKey, kek: CryptoKey): Promise<ArrayBuffer> {
  return await crypto.subtle.wrapKey('raw', dek, kek, {
    name: 'AES-GCM',
    length: 256
  });
}

/**
 * Unwrap DEK with KEK
 */
export async function unwrapDEK(
  wrappedDEK: ArrayBuffer,
  kek: CryptoKey
): Promise<CryptoKey> {
  return await crypto.subtle.unwrapKey(
    'raw',
    wrappedDEK,
    kek,
    {
      name: 'AES-GCM',
      length: 256
    },
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt text (convenience function)
 */
export async function encryptText(
  text: string,
  key: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const encrypted = await encryptData(data, key);
  return serializeEncrypted(encrypted);
}

/**
 * Decrypt text (convenience function)
 */
export async function decryptText(
  encryptedText: string,
  key: CryptoKey
): Promise<string> {
  const encrypted = deserializeEncrypted(encryptedText);
  const decrypted = await decryptData(encrypted, key);
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt JSON object
 */
export async function encryptJSON(
  obj: any,
  key: CryptoKey
): Promise<string> {
  const json = JSON.stringify(obj);
  return await encryptText(json, key);
}

/**
 * Decrypt JSON object
 */
export async function decryptJSON(
  encryptedText: string,
  key: CryptoKey
): Promise<any> {
  const decrypted = await decryptText(encryptedText, key);
  return JSON.parse(decrypted);
}

