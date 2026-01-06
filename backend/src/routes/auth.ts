import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, authenticatePassword, createAuthTokens, initializeUserKeys } from '../auth/auth';
import { generateTOTPSecret, generateTOTPURI, verifyTOTP } from '../auth/mfa';
import { generateRefreshToken, hashRefreshToken, verifyRefreshToken, generateAccessToken, verifyAccessToken, calculateTokenExpiry } from '../auth/sessions';
import { generateDeviceFingerprint, wrapDeviceKeyWithKEK, generateDeviceKey } from '../crypto/deviceKeys';
import { generateRecoveryCodes, hashRecoveryCode } from '../crypto/recovery';
import { serializeEncrypted } from '../crypto/encryption';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { query, transaction } from '../utils/db';
import { logAuth } from '../middleware/audit';
import { AuditEventType } from '../audit/events';
import { checkAlertRules } from '../services/alertService';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, device_name, device_fingerprint } = req.body;

    if (!email || !password || !device_name) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Missing required fields: email, password, device_name' }
      });
    }

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: { code: 'USER_EXISTS', message: 'User with this email already exists' }
      });
    }

    // Initialize user keys
    const { key: kek, salt: kekSalt } = await initializeUserKeys(password);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate device key
    const deviceKey = generateDeviceKey();
    const deviceFingerprint = device_fingerprint || generateDeviceFingerprint(req.headers['user-agent'] || '');

    // Wrap device key with KEK (for storage)
    const deviceKeyWrapped = wrapDeviceKeyWithKEK(deviceKey, kek);
    const deviceKeyWrappedBuffer = serializeEncrypted(deviceKeyWrapped);

    // Generate recovery codes
    const recoveryCodes = generateRecoveryCodes();
    const recoveryCodesHash = await Promise.all(recoveryCodes.map(code => hashRecoveryCode(code)));

    // Create user and device in transaction
    const result = await transaction(async (client) => {
      // Create user
      const userId = uuidv4();
      await client.query(
        `INSERT INTO users (id, email, password_hash, kek_salt, key_version, recovery_codes_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, email, passwordHash, kekSalt, 1, JSON.stringify(recoveryCodesHash)]
      );

      // Create device
      const deviceId = uuidv4();
      await client.query(
        `INSERT INTO devices (id, user_id, device_key_wrapped, device_name, device_fingerprint, trusted, last_seen)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [deviceId, userId, deviceKeyWrappedBuffer, device_name, deviceFingerprint, true]
      );

      // Generate tokens
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      const { accessToken, refreshToken, refreshTokenHash } = await createAuthTokens(userId, deviceId, jwtSecret);

      // Create session
      const sessionId = uuidv4();
      const accessTokenPayload = verifyAccessToken(accessToken, jwtSecret);
      await client.query(
        `INSERT INTO sessions (id, user_id, device_id, refresh_token_hash, access_token_jti, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, userId, deviceId, refreshTokenHash, accessTokenPayload.jti, calculateTokenExpiry(7 * 24 * 60 * 60)]
      );

      return { userId, accessToken, refreshToken };
    });

    // Log registration event
    await logAuth(req, AuditEventType.USER_REGISTER, {
      device_id: deviceId,
      device_name: device_name
    });

    // Return tokens and recovery codes (only shown once)
    res.status(201).json({
      user_id: result.userId,
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      expires_in: 900, // 15 minutes
      recovery_codes: recoveryCodes // Only returned once during registration
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Registration failed' }
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, mfa_code, device_name, device_fingerprint } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Missing email or password' }
      });
    }

    // Get user
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const passwordValid = await authenticatePassword(password, user.password_hash);
    if (!passwordValid.success) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    // Check MFA
    if (user.mfa_enabled) {
      if (!mfa_code) {
        return res.status(401).json({
          error: { code: 'MFA_REQUIRED', message: 'MFA code required' },
          mfa_required: true
        });
      }

      if (!user.mfa_secret) {
        return res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: 'MFA not properly configured' }
        });
      }

      const mfaValid = verifyTOTP(mfa_code, user.mfa_secret);
      if (!mfaValid) {
        return res.status(401).json({
          error: { code: 'INVALID_MFA', message: 'Invalid MFA code' }
        });
      }
    }

    // Get or create device
    const deviceFingerprint = device_fingerprint || generateDeviceFingerprint(req.headers['user-agent'] || '');
    let deviceId: string;
    let device: any;

    const deviceResult = await query(
      'SELECT * FROM devices WHERE user_id = $1 AND device_fingerprint = $2',
      [user.id, deviceFingerprint]
    );

    if (deviceResult.rows.length > 0) {
      device = deviceResult.rows[0];
      deviceId = device.id;
      // Update last_seen
      await query('UPDATE devices SET last_seen = NOW() WHERE id = $1', [deviceId]);
    } else {
      // Create new device
      deviceId = uuidv4();
      const deviceKey = generateDeviceKey();
      // Note: In real implementation, we'd need to get KEK to wrap device key
      // For MVP, we'll store a placeholder (device keys handled client-side for E2EE)
      const deviceKeyWrappedBuffer = Buffer.alloc(0); // Placeholder

      await query(
        `INSERT INTO devices (id, user_id, device_key_wrapped, device_name, device_fingerprint, trusted, last_seen)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [deviceId, user.id, deviceKeyWrappedBuffer, device_name || 'Unknown Device', deviceFingerprint, false]
      );
    }

    // Generate tokens
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const { accessToken, refreshToken, refreshTokenHash } = await createAuthTokens(user.id, deviceId, jwtSecret);

    // Create session
    const sessionId = uuidv4();
    const accessTokenPayload = verifyAccessToken(accessToken, jwtSecret);
    await query(
      `INSERT INTO sessions (id, user_id, device_id, refresh_token_hash, access_token_jti, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, user.id, deviceId, refreshTokenHash, accessTokenPayload.jti, calculateTokenExpiry(7 * 24 * 60 * 60)]
    );

    res.json({
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      mfa_required: false
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Login failed' }
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Missing refresh_token' }
      });
    }

    // Find session by refresh token hash
    const sessions = await query(
      'SELECT * FROM sessions WHERE expires_at > NOW() ORDER BY created_at DESC',
      []
    );

    let session: any = null;
    for (const s of sessions.rows) {
      const isValid = await verifyRefreshToken(refresh_token, s.refresh_token_hash);
      if (isValid) {
        session = s;
        break;
      }
    }

    if (!session) {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' }
      });
    }

    // Generate new tokens (rotate refresh token)
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const { accessToken, refreshToken: newRefreshToken, refreshTokenHash: newRefreshTokenHash } =
      await createAuthTokens(session.user_id, session.device_id, jwtSecret);

    // Update session with new refresh token
    const accessTokenPayload = verifyAccessToken(accessToken, jwtSecret);
    await query(
      `UPDATE sessions SET refresh_token_hash = $1, access_token_jti = $2, expires_at = $3 WHERE id = $4`,
      [newRefreshTokenHash, accessTokenPayload.jti, calculateTokenExpiry(7 * 24 * 60 * 60), session.id]
    );

    res.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: 900
    });
  } catch (error: any) {
    console.error('Refresh error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Token refresh failed' }
    });
  }
});

/**
 * POST /api/v1/auth/mfa/enable
 * Enable MFA for user
 */
router.post('/mfa/enable', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Check if MFA already enabled
    const userResult = await query('SELECT mfa_enabled FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    if (userResult.rows[0].mfa_enabled) {
      return res.status(409).json({
        error: { code: 'MFA_ALREADY_ENABLED', message: 'MFA is already enabled' }
      });
    }

    // Generate TOTP secret
    const secret = generateTOTPSecret();
    const userEmailResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
    const email = userEmailResult.rows[0].email;
    const uri = generateTOTPURI(secret, email);

    // Store secret (not enabled yet - user must verify first)
    await query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [secret, userId]);

    // Generate QR code data URL (simplified - in production use a QR code library)
    // For now, return the URI
    res.json({
      secret,
      qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`,
      manual_entry_key: secret
    });
  } catch (error: any) {
    console.error('Enable MFA error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to enable MFA' }
    });
  }
});

/**
 * POST /api/v1/auth/mfa/verify
 * Verify and complete MFA setup
 */
router.post('/mfa/verify', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Missing MFA code' }
      });
    }

    const userResult = await query('SELECT mfa_secret FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || !userResult.rows[0].mfa_secret) {
      return res.status(400).json({
        error: { code: 'MFA_NOT_SETUP', message: 'MFA secret not found. Enable MFA first.' }
      });
    }

    const secret = userResult.rows[0].mfa_secret;
    const isValid = verifyTOTP(code, secret);

    if (!isValid) {
      return res.status(401).json({
        error: { code: 'INVALID_MFA', message: 'Invalid MFA code' }
      });
    }

    // Enable MFA
    await query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId]);

    res.json({
      verified: true
    });
  } catch (error: any) {
    console.error('Verify MFA error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'MFA verification failed' }
    });
  }
});

/**
 * GET /api/v1/auth/sessions
 * List active sessions
 */
router.get('/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const sessionsResult = await query(
      `SELECT s.id, s.created_at, s.expires_at, d.device_name, s.access_token_jti
       FROM sessions s
       JOIN devices d ON s.device_id = d.id
       WHERE s.user_id = $1 AND s.expires_at > NOW()
       ORDER BY s.created_at DESC`,
      [userId]
    );

    // Note: In production, you'd want to include IP address and user agent from audit logs
    const sessions = sessionsResult.rows.map(s => ({
      id: s.id,
      device_name: s.device_name,
      created_at: s.created_at,
      last_activity: s.expires_at // Simplified - in production track actual last activity
    }));

    res.json({ sessions });
  } catch (error: any) {
    console.error('List sessions error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list sessions' }
    });
  }
});

/**
 * DELETE /api/v1/auth/sessions/:session_id
 * Revoke a session
 */
router.delete('/sessions/:session_id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = req.params.session_id;

    const result = await query(
      'DELETE FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' }
      });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke session' }
    });
  }
});

/**
 * GET /api/v1/auth/devices
 * List registered devices
 */
router.get('/devices', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const devicesResult = await query(
      'SELECT id, device_name, trusted, last_seen, created_at FROM devices WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      devices: devicesResult.rows.map(d => ({
        id: d.id,
        device_name: d.device_name,
        trusted: d.trusted,
        last_seen: d.last_seen,
        created_at: d.created_at
      }))
    });
  } catch (error: any) {
    console.error('List devices error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list devices' }
    });
  }
});

/**
 * DELETE /api/v1/auth/devices/:device_id
 * Revoke a device
 */
router.delete('/devices/:device_id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const deviceId = req.params.device_id;

    // Delete device and all its sessions
    await transaction(async (client) => {
      await client.query('DELETE FROM sessions WHERE device_id = $1 AND user_id = $2', [deviceId, userId]);
      const result = await client.query('DELETE FROM devices WHERE id = $1 AND user_id = $2', [deviceId, userId]);
      
      if (result.rowCount === 0) {
        throw new Error('Device not found');
      }
    });

    // Log device revocation
    await logAuth(req, AuditEventType.DEVICE_REVOKED, { device_id: deviceId });

    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Device not found') {
      return res.status(404).json({
        error: { code: 'DEVICE_NOT_FOUND', message: 'Device not found' }
      });
    }
    console.error('Revoke device error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke device' }
    });
  }
});

export default router;

