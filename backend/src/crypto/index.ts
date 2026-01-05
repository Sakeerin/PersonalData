/**
 * Cryptographic module exports
 */

// Encryption/Decryption
export {
  encrypt,
  decrypt,
  serializeEncrypted,
  deserializeEncrypted,
  generateDEK,
  type EncryptedData
} from './encryption';

// Key Management
export {
  deriveKEK,
  wrapDEK,
  unwrapDEK,
  generateWrappedDEK,
  rotateKEK,
  verifyKEK,
  type KEKParams,
  type DEK
} from './keyManager';

// Recovery Codes
export {
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
  verifyRecoveryCodeAgainstArray
} from './recovery';

// Device Keys
export {
  generateDeviceKey,
  wrapKEKWithDeviceKey,
  unwrapKEKWithDeviceKey,
  wrapDeviceKeyWithKEK,
  unwrapDeviceKeyWithKEK,
  generateDeviceFingerprint
} from './deviceKeys';

// Key Rotation
export {
  rotateUserKEK,
  rotateKEKWithoutPassword,
  type KeyRotationResult
} from './keyRotation';


