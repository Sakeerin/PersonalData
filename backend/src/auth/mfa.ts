import { authenticator, totp } from 'otplib';
import crypto from 'crypto';

/**
 * TOTP configuration
 */
const TOTP_SECRET_LENGTH = 20; // 160 bits
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;

/**
 * Generate a TOTP secret for a user
 * @returns Base32-encoded secret
 */
export function generateTOTPSecret(): string {
  const secret = crypto.randomBytes(TOTP_SECRET_LENGTH);
  return authenticator.encode(secret);
}

/**
 * Generate a TOTP URI for QR code generation
 * @param secret TOTP secret
 * @param email User email
 * @param issuer Service name
 * @returns TOTP URI
 */
export function generateTOTPURI(secret: string, email: string, issuer: string = 'Personal Data Vault'): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Verify a TOTP token
 * @param token User-provided token
 * @param secret TOTP secret
 * @returns True if token is valid
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

/**
 * Generate backup codes (alternative to TOTP)
 * These are simpler numeric codes, not the same as recovery codes
 * @param count Number of codes to generate
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-digit numeric code
    const code = crypto.randomInt(10000000, 99999999).toString();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code for storage
 * @param code Backup code
 * @returns Hashed code
 */
export async function hashBackupCode(code: string): Promise<string> {
  const { hashRecoveryCode } = await import('../crypto/recovery');
  return hashRecoveryCode(code);
}

/**
 * Verify a backup code
 * @param code Backup code
 * @param hash Hashed backup code
 * @returns True if code matches
 */
export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  const { verifyRecoveryCode } = await import('../crypto/recovery');
  return verifyRecoveryCode(code, hash);
}


