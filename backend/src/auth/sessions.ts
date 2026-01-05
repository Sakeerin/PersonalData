import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

/**
 * JWT configuration
 */
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Session token payload
 */
export interface TokenPayload {
  userId: string;
  deviceId: string;
  jti: string; // JWT ID
  type: 'access';
}

/**
 * Generate access token (JWT)
 * @param userId User ID
 * @param deviceId Device ID
 * @param secret JWT secret
 * @returns JWT token
 */
export function generateAccessToken(userId: string, deviceId: string, secret: string): string {
  const jti = uuidv4();
  const payload: TokenPayload = {
    userId,
    deviceId,
    jti,
    type: 'access'
  };

  return jwt.sign(payload, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    jwtid: jti
  });
}

/**
 * Verify access token
 * @param token JWT token
 * @param secret JWT secret
 * @returns Decoded token payload
 */
export function verifyAccessToken(token: string, secret: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate refresh token (random string)
 * @returns Refresh token
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash refresh token for storage
 * @param token Refresh token
 * @returns Hashed token
 */
export async function hashRefreshToken(token: string): Promise<string> {
  return await argon2.hash(token, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  });
}

/**
 * Verify refresh token
 * @param token Plaintext refresh token
 * @param hash Hashed refresh token
 * @returns True if token matches hash
 */
export async function verifyRefreshToken(token: string, hash: string): Promise<boolean> {
  try {
    await argon2.verify(hash, token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculate token expiration time
 * @param expiresIn Expiration in seconds
 * @returns Expiration Date
 */
export function calculateTokenExpiry(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000);
}

/**
 * Session information
 */
export interface SessionInfo {
  id: string;
  userId: string;
  deviceId: string;
  refreshTokenHash: string;
  accessTokenJti: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Create session info structure
 */
export function createSessionInfo(
  userId: string,
  deviceId: string,
  refreshTokenHash: string,
  accessTokenJti: string
): Omit<SessionInfo, 'id' | 'createdAt'> {
  return {
    userId,
    deviceId,
    refreshTokenHash,
    accessTokenJti,
    expiresAt: calculateTokenExpiry(REFRESH_TOKEN_EXPIRY)
  };
}


