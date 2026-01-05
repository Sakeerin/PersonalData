import argon2 from 'argon2';
import crypto from 'crypto';
import { encrypt, decrypt, EncryptedData, generateDEK } from './encryption';

/**
 * Key Encryption Key (KEK) - Master key for wrapping DEKs
 */
export interface KEKParams {
  key: Buffer;
  salt: Buffer;
}

/**
 * Data Encryption Key (DEK) - Per-item encryption key
 */
export interface DEK {
  key: Buffer;
  wrapped: EncryptedData;
}

/**
 * Argon2id parameters for KEK derivation
 */
const ARGON2_MEMORY = 65536; // 64 MB
const ARGON2_TIME_COST = 3;
const ARGON2_PARALLELISM = 4;
const ARGON2_KEY_LENGTH = 32; // 256 bits
const SALT_SIZE = 16;

/**
 * Derive KEK from user password/secret using Argon2id
 * @param password User password or secret
 * @param salt Optional salt (will generate if not provided)
 * @returns KEK and salt
 */
export async function deriveKEK(password: string, salt?: Buffer): Promise<KEKParams> {
  const saltBuffer = salt || crypto.randomBytes(SALT_SIZE);

  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: ARGON2_MEMORY,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
    hashLength: ARGON2_KEY_LENGTH,
    salt: saltBuffer,
    raw: true
  });

  return {
    key: Buffer.from(hash),
    salt: saltBuffer
  };
}

/**
 * Wrap DEK with KEK (encrypt DEK with KEK)
 * @param dek Data Encryption Key to wrap
 * @param kek Key Encryption Key
 * @returns Wrapped DEK (encrypted)
 */
export function wrapDEK(dek: Buffer, kek: Buffer): EncryptedData {
  return encrypt(dek, kek);
}

/**
 * Unwrap DEK with KEK (decrypt DEK with KEK)
 * @param wrappedDEK Wrapped DEK
 * @param kek Key Encryption Key
 * @returns Unwrapped DEK
 */
export function unwrapDEK(wrappedDEK: EncryptedData, kek: Buffer): Buffer {
  return decrypt(wrappedDEK, kek);
}

/**
 * Generate a new DEK and wrap it with KEK
 * @param kek Key Encryption Key
 * @returns DEK object with key and wrapped form
 */
export function generateWrappedDEK(kek: Buffer): DEK {
  const dek = generateDEK();
  const wrapped = wrapDEK(dek, kek);
  return {
    key: dek,
    wrapped
  };
}

/**
 * Rotate KEK: re-wrap all DEKs with new KEK
 * This function handles the wrapping operation only.
 * The caller is responsible for managing the DEK list.
 * 
 * @param oldKEK Old Key Encryption Key
 * @param newKEK New Key Encryption Key
 * @param wrappedDEKs Array of wrapped DEKs (encrypted with old KEK)
 * @returns Array of DEKs re-wrapped with new KEK
 */
export async function rotateKEK(
  oldKEK: Buffer,
  newKEK: Buffer,
  wrappedDEKs: EncryptedData[]
): Promise<EncryptedData[]> {
  const reWrappedDEKs: EncryptedData[] = [];

  for (const wrappedDEK of wrappedDEKs) {
    // Unwrap with old KEK
    const dek = unwrapDEK(wrappedDEK, oldKEK);
    // Re-wrap with new KEK
    const newWrapped = wrapDEK(dek, newKEK);
    reWrappedDEKs.push(newWrapped);
  }

  return reWrappedDEKs;
}

/**
 * Verify KEK by attempting to unwrap a test DEK
 * @param kek Key Encryption Key to verify
 * @param testWrappedDEK A wrapped DEK to test with
 * @returns True if KEK is valid
 */
export function verifyKEK(kek: Buffer, testWrappedDEK: EncryptedData): boolean {
  try {
    unwrapDEK(testWrappedDEK, kek);
    return true;
  } catch {
    return false;
  }
}


