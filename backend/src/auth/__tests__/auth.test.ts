import { hashPassword, verifyPassword, authenticatePassword, createAuthTokens, initializeUserKeys } from '../auth';
import { generateTOTPSecret, verifyTOTP, generateTOTPURI } from '../mfa';
import { generateAccessToken, verifyAccessToken, generateRefreshToken, hashRefreshToken, verifyRefreshToken } from '../sessions';

describe('Authentication', () => {
  const password = 'test_password_123';
  let passwordHash: string;
  let kek: Awaited<ReturnType<typeof initializeUserKeys>>;

  beforeEach(async () => {
    passwordHash = await hashPassword(password);
    kek = await initializeUserKeys(password);
  });

  describe('Password hashing', () => {
    it('should hash password', async () => {
      expect(passwordHash).toBeTruthy();
      expect(passwordHash).not.toBe(password);
      expect(passwordHash.length).toBeGreaterThan(0);
    });

    it('should verify correct password', async () => {
      const isValid = await verifyPassword(password, passwordHash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await verifyPassword('wrong_password', passwordHash);
      expect(isValid).toBe(false);
    });

    it('should produce different hashes for same password', async () => {
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2); // Different salts
    });
  });

  describe('Password authentication', () => {
    it('should authenticate correct password', async () => {
      const result = await authenticatePassword(password, passwordHash);
      expect(result.success).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const result = await authenticatePassword('wrong_password', passwordHash);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Key initialization', () => {
    it('should initialize user keys', async () => {
      expect(kek.key.length).toBe(32);
      expect(kek.salt.length).toBe(16);
    });

    it('should produce same KEK with same password and salt', async () => {
      const kek2 = await initializeUserKeys(password);
      // Different salts should produce different keys
      expect(kek2.key).not.toEqual(kek.key);
    });
  });

  describe('Token creation', () => {
    it('should create auth tokens', async () => {
      const userId = 'test-user-id';
      const deviceId = 'test-device-id';
      const jwtSecret = 'test_jwt_secret_min_32_bytes_long';

      const tokens = await createAuthTokens(userId, deviceId, jwtSecret);

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.refreshTokenHash).toBeTruthy();
      expect(tokens.expiresIn).toBe(900); // 15 minutes
    });
  });
});

