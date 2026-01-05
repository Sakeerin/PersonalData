import argon2 from 'argon2';
import { deriveKEK } from '../crypto/keyManager';
import { verifyTOTP } from './mfa';
import { generateAccessToken, generateRefreshToken, hashRefreshToken, verifyAccessToken } from './sessions';

/**
 * Hash password for storage
 * @param password Plaintext password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4
  });
}

/**
 * Verify password
 * @param password Plaintext password
 * @param hash Hashed password
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    await argon2.verify(hash, password);
    return true;
  } catch {
    return false;
  }
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  userId?: string;
  requiresMFA?: boolean;
  mfaSecret?: string;
  error?: string;
}

/**
 * Authenticate user with password
 * @param password Plaintext password
 * @param passwordHash Hashed password from database
 * @returns Authentication result
 */
export async function authenticatePassword(
  password: string,
  passwordHash: string
): Promise<Omit<AuthResult, 'requiresMFA' | 'mfaSecret'>> {
  const isValid = await verifyPassword(password, passwordHash);
  
  if (!isValid) {
    return {
      success: false,
      error: 'Invalid password'
    };
  }

  return {
    success: true
  };
}

/**
 * Authenticate with MFA
 * @param token TOTP token
 * @param secret TOTP secret
 * @returns True if token is valid
 */
export function authenticateMFA(token: string, secret: string): boolean {
  return verifyTOTP(token, secret);
}

/**
 * Create authentication tokens
 * @param userId User ID
 * @param deviceId Device ID
 * @param jwtSecret JWT secret
 * @returns Access token, refresh token, and expiry
 */
export async function createAuthTokens(
  userId: string,
  deviceId: string,
  jwtSecret: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  expiresIn: number;
}> {
  const accessToken = generateAccessToken(userId, deviceId, jwtSecret);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await hashRefreshToken(refreshToken);

  return {
    accessToken,
    refreshToken,
    refreshTokenHash,
    expiresIn: 15 * 60 // 15 minutes
  };
}

/**
 * Initialize user's cryptographic keys
 * @param password User password
 * @returns KEK and salt
 */
export async function initializeUserKeys(password: string) {
  return await deriveKEK(password);
}


