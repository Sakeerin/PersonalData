import crypto from 'crypto';
import { KEKParams, deriveKEK, wrapDEK, unwrapDEK } from './keyManager';
import { EncryptedData } from './encryption';

/**
 * Key rotation operation result
 */
export interface KeyRotationResult {
  newKEK: KEKParams;
  reWrappedDEKs: Array<{ id: string; wrappedDEK: EncryptedData }>;
}

/**
 * Rotate user's KEK (master key)
 * This is a high-level operation that handles the full rotation process.
 * 
 * Note: This function performs the cryptographic operations only.
 * The caller is responsible for:
 * - Persisting the new KEK salt
 * - Updating all wrapped DEKs in the database
 * - Managing transactions/rollback
 * 
 * @param oldPassword Current password/secret
 * @param newPassword New password/secret
 * @param oldSalt Salt used with old password
 * @param wrappedDEKs Array of wrapped DEKs with their IDs
 * @returns New KEK and re-wrapped DEKs
 */
export async function rotateUserKEK(
  oldPassword: string,
  newPassword: string,
  oldSalt: Buffer,
  wrappedDEKs: Array<{ id: string; wrappedDEK: EncryptedData }>
): Promise<KeyRotationResult> {
  // Derive old KEK
  const oldKEK = await deriveKEK(oldPassword, oldSalt);

  // Derive new KEK (with new salt)
  const newKEK = await deriveKEK(newPassword);

  // Re-wrap all DEKs
  const reWrappedDEKs = wrappedDEKs.map(({ id, wrappedDEK }) => {
    // Unwrap with old KEK
    const dek = unwrapDEK(wrappedDEK, oldKEK.key);
    // Re-wrap with new KEK
    const newWrapped = wrapDEK(dek, newKEK.key);
    return {
      id,
      wrappedDEK: newWrapped
    };
  });

  return {
    newKEK,
    reWrappedDEKs
  };
}

/**
 * Rotate KEK using existing KEK (password-less rotation)
 * Useful when user wants to rotate keys without changing password.
 * 
 * @param currentKEK Current KEK
 * @param wrappedDEKs Array of wrapped DEKs with their IDs
 * @returns New KEK and re-wrapped DEKs
 */
export async function rotateKEKWithoutPassword(
  currentKEK: Buffer,
  wrappedDEKs: Array<{ id: string; wrappedDEK: EncryptedData }>
): Promise<{ newKEK: Buffer; reWrappedDEKs: Array<{ id: string; wrappedDEK: EncryptedData }> }> {
  // Generate new random KEK
  const newKEK = crypto.randomBytes(32);

  // Re-wrap all DEKs
  const reWrappedDEKs = wrappedDEKs.map(({ id, wrappedDEK }) => {
    // Unwrap with old KEK
    const dek = unwrapDEK(wrappedDEK, currentKEK);
    // Re-wrap with new KEK
    const newWrapped = wrapDEK(dek, newKEK);
    return {
      id,
      wrappedDEK: newWrapped
    };
  });

  return {
    newKEK,
    reWrappedDEKs
  };
}

