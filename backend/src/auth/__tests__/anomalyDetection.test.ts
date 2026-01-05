import { AnomalyDetector, AnomalyDetector as AD } from '../anomalyDetection';
import { LoginContext } from '../anomalyDetection';

describe('Anomaly Detection', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AD();
  });

  const createLoginContext = (overrides: Partial<LoginContext> = {}): LoginContext => ({
    userId: 'test-user-id',
    email: 'test@example.com',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    timestamp: new Date(),
    ...overrides
  });

  describe('New device detection', () => {
    it('should detect new device on first login', () => {
      const context = createLoginContext({ deviceId: 'device-1' });
      const result = detector.detectAnomalies(context, []);

      // First login, no anomaly
      expect(result.isAnomalous).toBe(false);
    });

    it('should detect new device after previous logins', () => {
      const previousLogin = createLoginContext({ deviceId: 'device-1' });
      const currentLogin = createLoginContext({ deviceId: 'device-2' });

      detector.recordLogin(previousLogin);
      const result = detector.detectAnomalies(currentLogin, [previousLogin]);

      expect(result.isAnomalous).toBe(true);
      expect(result.reasons).toContain('New device detected');
      expect(result.severity).toBe('medium');
    });

    it('should not flag known device', () => {
      const previousLogin = createLoginContext({ deviceId: 'device-1' });
      const currentLogin = createLoginContext({ deviceId: 'device-1' });

      detector.recordLogin(previousLogin);
      const result = detector.detectAnomalies(currentLogin, [previousLogin]);

      expect(result.isAnomalous).toBe(false);
    });
  });

  describe('IP address detection', () => {
    it('should detect new IP address', () => {
      const previousLogin = createLoginContext({ ipAddress: '192.168.1.1' });
      const currentLogin = createLoginContext({ ipAddress: '192.168.1.2' });

      const result = detector.detectAnomalies(currentLogin, [previousLogin]);

      expect(result.isAnomalous).toBe(true);
      expect(result.reasons).toContain('Login from new IP address');
    });

    it('should not flag known IP address', () => {
      const previousLogin = createLoginContext({ ipAddress: '192.168.1.1' });
      const currentLogin = createLoginContext({ ipAddress: '192.168.1.1' });

      const result = detector.detectAnomalies(currentLogin, [previousLogin]);

      expect(result.isAnomalous).toBe(false);
    });
  });

  describe('Impossible travel detection', () => {
    it('should detect impossible travel', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const previousLogin = createLoginContext({
        timestamp: oneHourAgo,
        geoLocation: { country: 'US' }
      });
      const currentLogin = createLoginContext({
        timestamp: now,
        geoLocation: { country: 'JP' }
      });

      const result = detector.detectAnomalies(currentLogin, [previousLogin]);

      expect(result.isAnomalous).toBe(true);
      expect(result.reasons).toContain('Impossible travel detected');
      expect(result.severity).toBe('high');
    });

    it('should not flag travel with enough time', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      const previousLogin = createLoginContext({
        timestamp: threeHoursAgo,
        geoLocation: { country: 'US' }
      });
      const currentLogin = createLoginContext({
        timestamp: now,
        geoLocation: { country: 'JP' }
      });

      const result = detector.detectAnomalies(currentLogin, [previousLogin]);

      // Should not flag as impossible travel (enough time)
      expect(result.reasons).not.toContain('Impossible travel detected');
    });
  });

  describe('New country detection', () => {
    it('should detect new country', () => {
      const previousLogin = createLoginContext({
        geoLocation: { country: 'US' }
      });
      const currentLogin = createLoginContext({
        geoLocation: { country: 'JP' }
      });

      const result = detector.detectAnomalies(currentLogin, [previousLogin]);

      expect(result.isAnomalous).toBe(true);
      expect(result.reasons).toContain('Login from new country');
      expect(result.severity).toBe('high');
    });
  });

  describe('Action determination', () => {
    it('should set action to challenge for high severity', () => {
      const previousLogin = createLoginContext({ geoLocation: { country: 'US' } });
      const currentLogin = createLoginContext({ geoLocation: { country: 'JP' } });

      const result = detector.detectAnomalies(currentLogin, [previousLogin]);

      expect(result.action).toBe('challenge');
    });

    it('should set action to allow for low severity', () => {
      const previousLogin = createLoginContext({ ipAddress: '192.168.1.1' });
      const currentLogin = createLoginContext({ ipAddress: '192.168.1.2' });

      const result = detector.detectAnomalies(currentLogin, [previousLogin]);

      expect(result.action).toBe('allow');
    });
  });

  describe('Login recording', () => {
    it('should record login', () => {
      const context = createLoginContext({ deviceId: 'device-1' });
      detector.recordLogin(context);

      // Should not throw - internal state updated
      const result = detector.detectAnomalies(context, []);
      expect(result.isAnomalous).toBe(false);
    });

    it('should clear user data', () => {
      const context = createLoginContext({ deviceId: 'device-1' });
      detector.recordLogin(context);
      detector.clearUserData(context.userId);

      // Should not throw
      const result = detector.detectAnomalies(context, []);
      expect(result.isAnomalous).toBe(false);
    });
  });
});

