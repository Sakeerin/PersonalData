import crypto from 'crypto';
import { encrypt, decrypt, EncryptedData, generateDEK } from './encryption';
import { wrapDEK, unwrapDEK } from './keyManager';

/**
 * Device key parameters
 */
const DEVICE_KEY_SIZE = 32; // 256 bits

/**
 * Generate a device key
 * @returns Random device key
 */
export function generateDeviceKey(): Buffer {
  return crypto.randomBytes(DEVICE_KEY_SIZE);
}

/**
 * Wrap KEK with device key (for device-specific KEK storage)
 * This allows each device to store KEK encrypted with its device key.
 * @param kek Key Encryption Key
 * @param deviceKey Device key
 * @returns Wrapped KEK
 */
export function wrapKEKWithDeviceKey(kek: Buffer, deviceKey: Buffer): EncryptedData {
  return encrypt(kek, deviceKey);
}

/**
 * Unwrap KEK with device key
 * @param wrappedKEK Wrapped KEK
 * @param deviceKey Device key
 * @returns Unwrapped KEK
 */
export function unwrapKEKWithDeviceKey(wrappedKEK: EncryptedData, deviceKey: Buffer): Buffer {
  return decrypt(wrappedKEK, deviceKey);
}

/**
 * Wrap device key with KEK (for server storage)
 * Device keys are stored on server, wrapped with user's KEK.
 * @param deviceKey Device key
 * @param kek Key Encryption Key
 * @returns Wrapped device key
 */
export function wrapDeviceKeyWithKEK(deviceKey: Buffer, kek: Buffer): EncryptedData {
  return wrapDEK(deviceKey, kek);
}

/**
 * Unwrap device key with KEK
 * @param wrappedDeviceKey Wrapped device key
 * @param kek Key Encryption Key
 * @returns Unwrapped device key
 */
export function unwrapDeviceKeyWithKEK(wrappedDeviceKey: EncryptedData, kek: Buffer): Buffer {
  return unwrapDEK(wrappedDeviceKey, kek);
}

/**
 * Generate device fingerprint from user agent and other device characteristics
 * @param userAgent User agent string
 * @param additionalInfo Additional device information (optional)
 * @returns Device fingerprint hash
 */
export function generateDeviceFingerprint(
  userAgent: string,
  additionalInfo?: string
): string {
  const data = `${userAgent}${additionalInfo || ''}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}


