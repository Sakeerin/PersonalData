import { generateTOTPSecret, generateTOTPURI, verifyTOTP, generateBackupCodes, hashBackupCode, verifyBackupCode } from '../mfa';

describe('MFA (TOTP)', () => {
  const email = 'test@example.com';
  let secret: string;

  beforeEach(() => {
    secret = generateTOTPSecret();
  });

  describe('TOTP secret generation', () => {
    it('should generate TOTP secret', () => {
      expect(secret).toBeTruthy();
      expect(secret.length).toBeGreaterThan(0);
    });

    it('should generate unique secrets', () => {
      const secret1 = generateTOTPSecret();
      const secret2 = generateTOTPSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('TOTP URI generation', () => {
    it('should generate TOTP URI', () => {
      const uri = generateTOTPURI(secret, email);
      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain(email);
      expect(uri).toContain('secret=');
    });

    it('should include custom issuer', () => {
      const issuer = 'My App';
      const uri = generateTOTPURI(secret, email, issuer);
      expect(uri).toContain(issuer);
    });
  });

  describe('TOTP verification', () => {
    it('should verify valid TOTP token', () => {
      // Generate token using otplib directly (for testing)
      const { authenticator } = require('otplib');
      const token = authenticator.generate(secret);
      const isValid = verifyTOTP(token, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid TOTP token', () => {
      const invalidToken = '000000';
      const isValid = verifyTOTP(invalidToken, secret);
      expect(isValid).toBe(false);
    });

    it('should reject token for wrong secret', () => {
      const wrongSecret = generateTOTPSecret();
      const { authenticator } = require('otplib');
      const token = authenticator.generate(secret);
      const isValid = verifyTOTP(token, wrongSecret);
      expect(isValid).toBe(false);
    });
  });

  describe('Backup codes', () => {
    it('should generate backup codes', () => {
      const codes = generateBackupCodes();
      expect(codes.length).toBe(10);
      codes.forEach(code => {
        expect(code.length).toBe(8);
        expect(code).toMatch(/^\d{8}$/); // 8 digits
      });
    });

    it('should generate unique backup codes', () => {
      const codes = generateBackupCodes();
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should hash and verify backup code', async () => {
      const code = '12345678';
      const hash = await hashBackupCode(code);
      const isValid = await verifyBackupCode(code, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect backup code', async () => {
      const code = '12345678';
      const hash = await hashBackupCode(code);
      const isValid = await verifyBackupCode('87654321', hash);
      expect(isValid).toBe(false);
    });
  });
});

