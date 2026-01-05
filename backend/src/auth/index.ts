/**
 * Authentication module exports
 */

// Authentication
export {
  hashPassword,
  verifyPassword,
  authenticatePassword,
  createAuthTokens,
  initializeUserKeys,
  type AuthResult
} from './auth';

// MFA
export {
  generateTOTPSecret,
  generateTOTPURI,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode
} from './mfa';

// Sessions
export {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
  calculateTokenExpiry,
  createSessionInfo,
  type TokenPayload,
  type SessionInfo
} from './sessions';

// Anomaly Detection
export {
  AnomalyDetector,
  anomalyDetector,
  type LoginContext,
  type AnomalyResult
} from './anomalyDetection';

