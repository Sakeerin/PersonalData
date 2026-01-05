import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
  calculateTokenExpiry
} from '../sessions';

describe('Sessions', () => {
  const userId = 'test-user-id';
  const deviceId = 'test-device-id';
  const jwtSecret = 'test_jwt_secret_min_32_bytes_long';

  describe('Access token (JWT)', () => {
    it('should generate access token', () => {
      const token = generateAccessToken(userId, deviceId, jwtSecret);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should verify access token', () => {
      const token = generateAccessToken(userId, deviceId, jwtSecret);
      const payload = verifyAccessToken(token, jwtSecret);

      expect(payload.userId).toBe(userId);
      expect(payload.deviceId).toBe(deviceId);
      expect(payload.type).toBe('access');
      expect(payload.jti).toBeTruthy();
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid_token';
      expect(() => verifyAccessToken(invalidToken, jwtSecret)).toThrow();
    });

    it('should reject token with wrong secret', () => {
      const token = generateAccessToken(userId, deviceId, jwtSecret);
      const wrongSecret = 'wrong_secret_min_32_bytes_long';
      expect(() => verifyAccessToken(token, wrongSecret)).toThrow();
    });

    it('should generate different tokens', () => {
      const token1 = generateAccessToken(userId, deviceId, jwtSecret);
      const token2 = generateAccessToken(userId, deviceId, jwtSecret);
      expect(token1).not.toBe(token2); // Different jti
    });
  });

  describe('Refresh token', () => {
    it('should generate refresh token', () => {
      const token = generateRefreshToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique refresh tokens', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();
      expect(token1).not.toBe(token2);
    });

    it('should hash and verify refresh token', async () => {
      const token = generateRefreshToken();
      const hash = await hashRefreshToken(token);
      const isValid = await verifyRefreshToken(token, hash);

      expect(isValid).toBe(true);
      expect(hash).not.toBe(token);
    });

    it('should reject incorrect refresh token', async () => {
      const token = generateRefreshToken();
      const hash = await hashRefreshToken(token);
      const wrongToken = generateRefreshToken();
      const isValid = await verifyRefreshToken(wrongToken, hash);

      expect(isValid).toBe(false);
    });
  });

  describe('Token expiry', () => {
    it('should calculate token expiry', () => {
      const expiresIn = 3600; // 1 hour
      const expiry = calculateTokenExpiry(expiresIn);
      const now = new Date();
      const expected = new Date(now.getTime() + expiresIn * 1000);

      // Allow 1 second difference for timing
      expect(Math.abs(expiry.getTime() - expected.getTime())).toBeLessThan(1000);
    });
  });
});

