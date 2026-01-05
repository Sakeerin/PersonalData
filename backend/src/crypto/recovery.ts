import crypto from 'crypto';
import argon2 from 'argon2';

/**
 * Recovery code generation parameters
 */
const CODE_LENGTH = 8; // 8 characters per code
const CODE_COUNT = 10; // 10 recovery codes
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Base32-like, no ambiguous chars

/**
 * Generate recovery codes
 * @returns Array of recovery code strings
 */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];

  for (let i = 0; i < CODE_COUNT; i++) {
    let code = '';
    for (let j = 0; j < CODE_LENGTH; j++) {
      const randomIndex = crypto.randomInt(0, CODE_CHARSET.length);
      code += CODE_CHARSET[randomIndex];
    }
    codes.push(code);
  }

  return codes;
}

/**
 * Hash a recovery code for storage
 * @param code Recovery code (plaintext)
 * @returns Hashed code
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  // Use Argon2id for hashing recovery codes
  return await argon2.hash(code, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4
  });
}

/**
 * Verify a recovery code against a hash
 * @param code Recovery code (plaintext)
 * @param hash Hashed recovery code
 * @returns True if code matches hash
 */
export async function verifyRecoveryCode(code: string, hash: string): Promise<boolean> {
  try {
    await argon2.verify(hash, code);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify a recovery code against an array of hashed codes
 * @param code Recovery code (plaintext)
 * @param hashes Array of hashed recovery codes
 * @returns Index of matched hash, or -1 if no match
 */
export async function verifyRecoveryCodeAgainstArray(
  code: string,
  hashes: string[]
): Promise<number> {
  for (let i = 0; i < hashes.length; i++) {
    const isValid = await verifyRecoveryCode(code, hashes[i]);
    if (isValid) {
      return i;
    }
  }
  return -1;
}


